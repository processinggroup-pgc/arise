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
import { runDiscoveryAgent } from "./run-discovery-agent.js";
import { runSecurityAgent } from "./run-security-agent.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_security",
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

async function seedSecurityScenario(): Promise<{
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
      dataClassification: "authentication",
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

describe("runSecurityAgent", () => {
  it("raises non-waivable security findings and completes with a threat model", async () => {
    const seeded = await seedSecurityScenario();
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

    const discoveryWithInjection = {
      ...discovery.output,
      assessmentEvidence: {
        ...discovery.output.assessmentEvidence,
        containsPromptInjection: true,
        observedRisks: ["Prompt injection pattern detected: ignore-previous-instructions"],
      },
    };

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
            after: 'const api_key = "leaked";\nexport function listMemberships() {}',
          },
        ],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      {
        id: "evidence_1",
        capturedAt: operationContext.now(),
      },
    );

    const result = await runSecurityAgent(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        registeredModelId: model.id,
        discoveryOutput: discoveryWithInjection,
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

    expect(result.inputContract.allowedTools).toEqual([
      "repository.read_file",
      "repository.search",
    ]);
    expect(result.output.threatModel.threats.length).toBeGreaterThan(0);
    expect(result.output.reviewFindings.length).toBeGreaterThan(0);
    expect(result.raisedFindingIds.length).toBe(result.output.reviewFindings.length);
    expect(result.output.discoveryRunId).toBe(discovery.output.agentRunId);
    expect(result.output.executionEvidenceId).toBe("evidence_1");

    const savedFindings = await findingStore.listFindingsForWorkItem(seeded.workItemId);
    expect(savedFindings.every((finding) => finding.category === "security")).toBe(true);
    expect(savedFindings.some((finding) => finding.title.includes("secret material"))).toBe(true);

    const savedRun = await agentRunStore.findAgentRunById(result.output.agentRunId);
    expect(savedRun?.status).toBe("completed");
    expect(savedRun?.agentType).toBe("security");
  });

  it("blocks security runs when discovery output belongs to another work item", async () => {
    const seeded = await seedSecurityScenario();
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
      runSecurityAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: seeded.repositoryId,
          registeredModelId: model.id,
          discoveryOutput: { ...discovery.output, workItemId: "work_item_other" },
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

  it("blocks security runs when execution evidence is outside the tenant scope", async () => {
    const seeded = await seedSecurityScenario();
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

    const executionEvidence = createExecutionEvidence(
      {
        organizationId: "org_other",
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
      runSecurityAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: seeded.repositoryId,
          registeredModelId: model.id,
          discoveryOutput: discovery.output,
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
