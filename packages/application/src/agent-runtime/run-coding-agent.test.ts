import { describe, expect, it } from "vitest";

import { createTenantContext, createRepository } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";
import { FakeSandboxAdapter, FakeWorkspaceAdapter } from "@arise/integration-sandbox";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository } from "../repository-intelligence/index-repository.js";
import { InMemoryRepositoryIndexStore } from "../repository-intelligence/in-memory-repository-index-store.js";
import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { InMemoryExecutionEvidenceStore } from "../execution/in-memory-execution-evidence-store.js";
import { InMemoryToolCallStore } from "./in-memory-tool-call-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryModelRegistryStore } from "./in-memory-model-registry-store.js";
import { registerPlatformModel } from "./register-model.js";
import { runArchitectureAgent } from "./run-architecture-agent.js";
import { runCodingAgent } from "./run-coding-agent.js";
import { runDiscoveryAgent } from "./run-discovery-agent.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_coding",
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

const contentFixture = {
  installationId: "install_123",
  owner: "PgC-git",
  name: "arise",
  files: [
    {
      path: "src/memberships/route.ts",
      content:
        'import { MembershipService } from "./service";\nexport function listMemberships() {}',
    },
    {
      path: "src/memberships/service.ts",
      content: "export class MembershipService {}",
    },
  ],
};

async function seedCodingScenario(): Promise<{
  workItemId: string;
  repositoryId: string;
  workItemStore: InMemoryWorkItemStore;
  repositoryStore: InMemoryRepositoryStore;
  repositoryIndexStore: InMemoryRepositoryIndexStore;
  contentPort: FakeGitHubContentAdapter;
  modelId: string;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const repositoryIndexStore = new InMemoryRepositoryIndexStore();
  const modelStore = new InMemoryModelRegistryStore();
  const githubPort = new FakeGitHubAdapter([githubFixture]);
  const contentPort = new FakeGitHubContentAdapter([contentFixture]);

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

  await indexRepository(
    { tenantContext, repositoryId: repository.id },
    repositoryStore,
    repositoryIndexStore,
    contentPort,
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
    repositoryIndexStore,
    contentPort,
    modelId: model.id,
  };
}

describe("runCodingAgent", () => {
  it("implements one coding task with failing tests first and sandbox execution evidence", async () => {
    const seeded = await seedCodingScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const toolCallStore = new InMemoryToolCallStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const executionEvidenceStore = new InMemoryExecutionEvidenceStore();
    const sandboxPort = new FakeSandboxAdapter();
    const workspacePort = new FakeWorkspaceAdapter();

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

    const discovery = await runDiscoveryAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
      operationContext,
    );

    const architecture = await runArchitectureAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        discoveryOutput: discovery.output,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
      operationContext,
    );

    const result = await runCodingAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        architectureOutput: architecture.output,
        branch: "feature/onboarding",
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      executionEvidenceStore,
      sandboxPort,
      workspacePort,
      seeded.contentPort,
      operationContext,
    );

    expect(result.inputContract.allowedTools).toContain("repository.write_file");
    expect(result.inputContract.allowedTools).toContain("git.commit");
    expect(result.output.task.targetPaths[0]).toBe("src/memberships/route.test.ts");
    expect(result.output.executionEvidence.commitId).toMatch(/^fake_commit_/);
    expect(result.output.executionEvidence.changedPaths).toHaveLength(2);
    expect(result.output.executionEvidence.toolCallEvidenceRefs.length).toBeGreaterThan(0);
    expect(result.capturedExecutionEvidence.commitId).toBe(
      result.output.executionEvidence.commitId,
    );
    expect(result.capturedExecutionEvidence.diffs.length).toBeGreaterThan(0);
    expect(result.output.architectureRunId).toBe(architecture.output.agentRunId);

    const savedRun = await agentRunStore.findAgentRunById(result.output.agentRunId);
    expect(savedRun?.status).toBe("completed");
  });

  it("blocks coding runs when architecture output belongs to another work item", async () => {
    const seeded = await seedCodingScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();

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

    const discovery = await runDiscoveryAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
      operationContext,
    );

    const architecture = await runArchitectureAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        discoveryOutput: discovery.output,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
      operationContext,
    );

    const mismatchedArchitecture = {
      ...architecture.output,
      workItemId: "work_item_other",
    };

    await expect(
      runCodingAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: seeded.repositoryId,
          registeredModelId: model.id,
          architectureOutput: mismatchedArchitecture,
          branch: "feature/onboarding",
          seedFilePaths: ["src/memberships/route.ts"],
        },
        seeded.workItemStore,
        seeded.repositoryStore,
        seeded.repositoryIndexStore,
        modelStore,
        new InMemoryAgentRunStore(),
        new InMemoryToolCallStore(),
        new InMemoryExecutionSessionStore(),
        new InMemoryExecutionEvidenceStore(),
        new FakeSandboxAdapter(),
        new FakeWorkspaceAdapter(),
        seeded.contentPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });

  it("blocks coding runs when the repository is outside the work item project", async () => {
    const seeded = await seedCodingScenario();
    const projectStore = new InMemoryProjectStore();
    const repositoryStore = new InMemoryRepositoryStore();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();

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

    const discovery = await runDiscoveryAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
      operationContext,
    );

    const architecture = await runArchitectureAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        discoveryOutput: discovery.output,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      seeded.contentPort,
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
      runCodingAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: foreignRepository.id,
          registeredModelId: model.id,
          architectureOutput: architecture.output,
          branch: "feature/onboarding",
          seedFilePaths: ["src/memberships/route.ts"],
        },
        seeded.workItemStore,
        repositoryStore,
        seeded.repositoryIndexStore,
        modelStore,
        new InMemoryAgentRunStore(),
        new InMemoryToolCallStore(),
        new InMemoryExecutionSessionStore(),
        new InMemoryExecutionEvidenceStore(),
        new FakeSandboxAdapter(),
        new FakeWorkspaceAdapter(),
        seeded.contentPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
