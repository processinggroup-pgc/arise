import { describe, expect, it } from "vitest";

import { createTenantContext, createRepository } from "@arise/domain";
import { FakeGitHubAdapter } from "@arise/integration-github";
import { FakeSandboxAdapter, FakeWorkspaceAdapter } from "@arise/integration-sandbox";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { InMemoryExecutionEvidenceStore } from "../execution/in-memory-execution-evidence-store.js";
import { InMemoryToolCallStore } from "./in-memory-tool-call-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryModelRegistryStore } from "./in-memory-model-registry-store.js";
import { registerPlatformModel } from "./register-model.js";
import { runQaAgent } from "./run-qa-agent.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_qa",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const githubFixture = {
  installationId: "install_123",
  owner: "PgC-git",
  name: "arise",
  externalId: "987654321",
  fullName: "PgC-git/arise",
  defaultBranch: "main",
  htmlUrl: "https://github.com/PgC-git/arise",
  private: true,
};

async function seedQaScenario(): Promise<{
  workItemId: string;
  repositoryId: string;
  workItemStore: InMemoryWorkItemStore;
  repositoryStore: InMemoryRepositoryStore;
  modelId: string;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const modelStore = new InMemoryModelRegistryStore();
  const githubPort = new FakeGitHubAdapter([githubFixture]);

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      title: "Improve membership onboarding",
      type: "feature",
      riskLevel: "high",
      ownerId: "user_owner",
      problemStatement: "Membership onboarding is fragmented across modules.",
      targetUser: "Platform engineer",
      desiredBehavior: "Onboarding is orchestrated through one workflow.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A new member account",
          when: "They start onboarding",
          then: "The workflow completes in one path",
        },
        {
          given: "An incomplete profile",
          when: "Onboarding resumes",
          then: "Progress is restored",
        },
      ],
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  const repository = await connectRepositoryForProject(
    {
      tenantContext,
      projectId: project.id,
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
    },
    projectStore,
    repositoryStore,
    githubPort,
    operationContext,
  );

  const model = await registerPlatformModel(
    {
      provider: "openai",
      name: "gpt-4.1",
      version: "2026-08-01",
      capabilities: ["text", "tool_use"],
      status: "active",
    },
    modelStore,
    operationContext,
  );

  return {
    workItemId: workItem.id,
    repositoryId: repository.id,
    workItemStore,
    repositoryStore,
    modelId: model.id,
  };
}

describe("runQaAgent", () => {
  it("generates independent failing tests from acceptance criteria with trace references", async () => {
    const seeded = await seedQaScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const toolCallStore = new InMemoryToolCallStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const executionEvidenceStore = new InMemoryExecutionEvidenceStore();

    const model = await registerPlatformModel(
      {
        provider: "openai",
        name: "gpt-4.1",
        version: "2026-08-01",
        capabilities: ["text", "tool_use"],
        status: "active",
      },
      modelStore,
      operationContext,
    );

    const result = await runQaAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        branch: "qa/onboarding",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      modelStore,
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      executionEvidenceStore,
      new FakeSandboxAdapter(),
      new FakeWorkspaceAdapter(),
      operationContext,
    );

    expect(result.inputContract.contextItems).toEqual([]);
    expect(result.inputContract.allowedTools).toContain("repository.write_file");
    expect(result.output.generatedTests).toHaveLength(2);
    expect(result.output.generatedTests[0]?.traceRef).toMatch(/^WI-/);
    expect(result.output.generatedTests[0]?.path).toContain("tests/acceptance/");
    expect(result.output.executionEvidence.commitId).toMatch(/^fake_commit_/);
    expect(result.output.executionEvidence.changedPaths).toHaveLength(2);
    expect(result.capturedExecutionEvidence.agentRunId).toBe(result.output.agentRunId);

    const savedRun = await agentRunStore.findAgentRunById(result.output.agentRunId);
    expect(savedRun?.status).toBe("completed");
    expect(savedRun?.agentType).toBe("qa");
  });

  it("blocks qa runs when the repository is outside the work item project", async () => {
    const seeded = await seedQaScenario();
    const projectStore = new InMemoryProjectStore();
    const repositoryStore = new InMemoryRepositoryStore();
    const modelStore = new InMemoryModelRegistryStore();

    const model = await registerPlatformModel(
      {
        provider: "openai",
        name: "gpt-4.1",
        version: "2026-08-01",
        capabilities: ["text", "tool_use"],
        status: "active",
      },
      modelStore,
      operationContext,
    );

    const foreignProject = await createProjectForOrganization(
      { tenantContext, name: "Other Project" },
      projectStore,
      operationContext,
    );

    const foreignRepository = createRepository(
      {
        organizationId: tenantContext.organizationId,
        projectId: foreignProject.id,
        provider: "github",
        externalId: "111222333",
        fullName: "PgC-git/other-repo",
        defaultBranch: "main",
        installationId: "install_456",
        status: "connected",
      },
      { id: "repo_foreign", createdAt: operationContext.now() },
    );
    await repositoryStore.saveRepository(foreignRepository);

    await expect(
      runQaAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: foreignRepository.id,
          registeredModelId: model.id,
          branch: "qa/onboarding",
        },
        seeded.workItemStore,
        repositoryStore,
        modelStore,
        new InMemoryAgentRunStore(),
        new InMemoryToolCallStore(),
        new InMemoryExecutionSessionStore(),
        new InMemoryExecutionEvidenceStore(),
        new FakeSandboxAdapter(),
        new FakeWorkspaceAdapter(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
