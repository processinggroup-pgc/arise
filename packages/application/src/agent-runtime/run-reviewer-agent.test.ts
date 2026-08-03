import { describe, expect, it } from "vitest";

import { createExecutionEvidence, createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository } from "../repository-intelligence/index-repository.js";
import { InMemoryRepositoryIndexStore } from "../repository-intelligence/in-memory-repository-index-store.js";
import { InMemoryFindingStore } from "../verification/in-memory-finding-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryModelRegistryStore } from "./in-memory-model-registry-store.js";
import { registerPlatformModel } from "./register-model.js";
import { runArchitectureAgent } from "./run-architecture-agent.js";
import { runDiscoveryAgent } from "./run-discovery-agent.js";
import { runReviewerAgent } from "./run-reviewer-agent.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_reviewer",
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

async function seedReviewerScenario(): Promise<{
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

describe("runReviewerAgent", () => {
  it("reviews diffs against requirements and constitution with read-only tools", async () => {
    const seeded = await seedReviewerScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const findingStore = new InMemoryFindingStore();

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

    const executionEvidence = createExecutionEvidence(
      {
        organizationId: tenantContext.organizationId,
        executionSessionId: "session_1",
        agentRunId: "run_coding_1",
        workItemId: seeded.workItemId,
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/memberships/route.ts"],
        diffs: [
          {
            path: "src/memberships/route.ts",
            before: "export function listMemberships() {}",
            after: "export function listMemberships() { return []; }",
          },
        ],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      {
        id: "evidence_1",
        capturedAt: operationContext.now(),
      },
    );

    const result = await runReviewerAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        architectureOutput: architecture.output,
        executionEvidence,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      findingStore,
      seeded.contentPort,
      operationContext,
    );

    expect(result.inputContract.allowedTools).toEqual(["repository.read_file", "repository.search"]);
    expect(result.output.verdict).toBe("changes_requested");
    expect(result.output.requirementCoverage[0]?.status).toBe("partial");
    expect(result.raisedFindingIds.length).toBeGreaterThan(0);
    expect(result.output.architectureRunId).toBe(architecture.output.agentRunId);

    const savedRun = await agentRunStore.findAgentRunById(result.output.agentRunId);
    expect(savedRun?.status).toBe("completed");
    expect(savedRun?.agentType).toBe("reviewer");
  });

  it("approves reviews when implementation and linked tests are present", async () => {
    const seeded = await seedReviewerScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const findingStore = new InMemoryFindingStore();

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

    const executionEvidence = createExecutionEvidence(
      {
        organizationId: tenantContext.organizationId,
        executionSessionId: "session_1",
        agentRunId: "run_coding_1",
        workItemId: seeded.workItemId,
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/memberships/route.ts", "src/memberships/route.test.ts"],
        diffs: [
          {
            path: "src/memberships/route.ts",
            before: "export function listMemberships() {}",
            after: "export function listMemberships() { return []; }",
          },
          {
            path: "src/memberships/route.test.ts",
            before: "describe('route', () => {});",
            after: "describe('route', () => { it('completes onboarding', () => {}); });",
          },
        ],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      {
        id: "evidence_2",
        capturedAt: operationContext.now(),
      },
    );

    const result = await runReviewerAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        architectureOutput: architecture.output,
        executionEvidence,
        seedFilePaths: ["src/memberships/route.ts"],
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      seeded.repositoryIndexStore,
      modelStore,
      agentRunStore,
      findingStore,
      seeded.contentPort,
      operationContext,
    );

    expect(result.output.verdict).toBe("approved");
    expect(result.raisedFindingIds).toHaveLength(0);
  });

  it("blocks reviewer runs when architecture output belongs to another work item", async () => {
    const seeded = await seedReviewerScenario();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const findingStore = new InMemoryFindingStore();

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

    const executionEvidence = createExecutionEvidence(
      {
        organizationId: tenantContext.organizationId,
        executionSessionId: "session_1",
        agentRunId: "run_coding_1",
        workItemId: seeded.workItemId,
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/memberships/route.ts"],
        diffs: [
          {
            path: "src/memberships/route.ts",
            before: "export function listMemberships() {}",
            after: "export function listMemberships() { return []; }",
          },
        ],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      {
        id: "evidence_1",
        capturedAt: operationContext.now(),
      },
    );

    await expect(
      runReviewerAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: seeded.repositoryId,
          registeredModelId: model.id,
          architectureOutput: { ...architecture.output, workItemId: "work_item_other" },
          executionEvidence,
          seedFilePaths: ["src/memberships/route.ts"],
        },
        seeded.workItemStore,
        seeded.repositoryStore,
        seeded.repositoryIndexStore,
        modelStore,
        agentRunStore,
        findingStore,
        seeded.contentPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
