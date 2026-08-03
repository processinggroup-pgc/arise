import { describe, expect, it } from "vitest";

import {
  createAgentRun,
  createAgentRunBudgetUsage,
  createAgentRunInputContract,
  createTenantContext,
  createToolActionEnvelope,
  REPOSITORY_GIT_TOOL_NAMES,
  startAgentRun,
} from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";
import { FakeSandboxAdapter, FakeWorkspaceAdapter } from "@arise/integration-sandbox";

import { InMemoryAgentRunStore } from "../agent-runtime/in-memory-agent-run-store.js";
import { InMemoryToolCallStore } from "../agent-runtime/in-memory-tool-call-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository } from "../repository-intelligence/index-repository.js";
import { InMemoryRepositoryIndexStore } from "../repository-intelligence/in-memory-repository-index-store.js";
import { InMemoryExecutionSessionStore } from "./in-memory-execution-session-store.js";
import { provisionExecutionSession } from "./provision-execution-session.js";
import { executeTypedToolAction, TypedToolExecutionError } from "./execute-typed-tool-action.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_typed_tools",
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
  files: [{ path: "src/index.ts", content: "export {};" }],
};

async function seedExecutionScenario(): Promise<{
  workItemId: string;
  repositoryId: string;
  workItemStore: InMemoryWorkItemStore;
  repositoryStore: InMemoryRepositoryStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const repositoryIndexStore = new InMemoryRepositoryIndexStore();
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
      title: "Implement onboarding workflow",
      type: "feature",
      riskLevel: "medium",
      ownerId: "user_owner",
      problemStatement: "Onboarding requires too many manual steps for new projects.",
      targetUser: "Platform engineer",
      desiredBehavior: "Onboarding completes through one guided workflow.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A new project",
          when: "Onboarding starts",
          then: "A sandbox workspace is provisioned",
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

  return {
    workItemId: workItem.id,
    repositoryId: repository.id,
    workItemStore,
    repositoryStore,
  };
}

describe("executeTypedToolAction", () => {
  it("authorizes and executes repository read tools against the sandbox workspace", async () => {
    const seeded = await seedExecutionScenario();
    const agentRunStore = new InMemoryAgentRunStore();
    const toolCallStore = new InMemoryToolCallStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const sandboxPort = new FakeSandboxAdapter();
    const workspacePort = new FakeWorkspaceAdapter();

    const inputContract = createAgentRunInputContract({
      role: "coding",
      workItemId: seeded.workItemId,
      outputSchemaRef: "schemas/coding-output.schema.json",
      allowedTools: [...REPOSITORY_GIT_TOOL_NAMES],
      budget: { maxActions: 20, maxCostUsd: 5, maxTokens: 50_000 },
      contextItems: [],
    });

    const run = createAgentRun(
      {
        organizationId: tenantContext.organizationId,
        workItemId: seeded.workItemId,
        agentType: "coding",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
      },
      { id: "run_coding_1", createdAt: operationContext.now() },
    );
    await agentRunStore.saveAgentRun(startAgentRun(run, operationContext.now()));

    const session = await provisionExecutionSession(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        branch: "feature/onboarding",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      executionSessionStore,
      sandboxPort,
      operationContext,
    );

    workspacePort.seedWorkspace(
      session.sandboxSessionId,
      { "src/index.ts": "export {};" },
      session.branch,
    );

    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: seeded.workItemId,
        agentRunId: run.id,
        tool: "repository.read_file",
        arguments: { path: "src/index.ts" },
        purpose: "Inspect repository entrypoint",
        expectedEffect: "Return file contents",
        riskClass: "green",
        idempotencyKey: "read-index",
      },
      { actionId: "action_1" },
    );

    const result = await executeTypedToolAction(
      {
        tenantContext,
        envelope,
        inputContract,
        budgetUsage: createAgentRunBudgetUsage(),
        executionSessionId: session.id,
      },
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      workspacePort,
      operationContext,
    );

    expect(result.toolCall.status).toBe("completed");
    expect(result.evidenceRef).toBe(`execution/${session.id}/${result.toolCall.id}.json`);
    expect(result.toolResult?.tool).toBe("repository.read_file");
    if (result.toolResult?.tool === "repository.read_file") {
      expect(result.toolResult.result.content).toBe("export {};");
    }
  });

  it("blocks path traversal in typed repository write tools", async () => {
    const seeded = await seedExecutionScenario();
    const agentRunStore = new InMemoryAgentRunStore();
    const toolCallStore = new InMemoryToolCallStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const sandboxPort = new FakeSandboxAdapter();
    const workspacePort = new FakeWorkspaceAdapter();

    const inputContract = createAgentRunInputContract({
      role: "coding",
      workItemId: seeded.workItemId,
      outputSchemaRef: "schemas/coding-output.schema.json",
      allowedTools: [...REPOSITORY_GIT_TOOL_NAMES],
      budget: { maxActions: 20, maxCostUsd: 5, maxTokens: 50_000 },
      contextItems: [],
    });

    const run = createAgentRun(
      {
        organizationId: tenantContext.organizationId,
        workItemId: seeded.workItemId,
        agentType: "coding",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
      },
      { id: "run_coding_2", createdAt: operationContext.now() },
    );
    await agentRunStore.saveAgentRun(startAgentRun(run, operationContext.now()));

    const session = await provisionExecutionSession(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        branch: "feature/onboarding",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      executionSessionStore,
      sandboxPort,
      operationContext,
    );

    workspacePort.seedWorkspace(session.sandboxSessionId, {}, session.branch);

    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: seeded.workItemId,
        agentRunId: run.id,
        tool: "repository.write_file",
        arguments: { path: "../etc/passwd", content: "malicious" },
        purpose: "Attempt traversal",
        expectedEffect: "Write outside workspace",
        riskClass: "red",
        idempotencyKey: "write-traversal",
      },
      { actionId: "action_2" },
    );

    await expect(
      executeTypedToolAction(
        {
          tenantContext,
          envelope,
          inputContract,
          budgetUsage: createAgentRunBudgetUsage(),
          executionSessionId: session.id,
        },
        agentRunStore,
        toolCallStore,
        executionSessionStore,
        workspacePort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(TypedToolExecutionError);
  });
});
