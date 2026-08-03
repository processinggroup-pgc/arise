import { describe, expect, it } from "vitest";

import { createTenantContext, createRepository } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository } from "../repository-intelligence/index-repository.js";
import { InMemoryRepositoryIndexStore } from "../repository-intelligence/in-memory-repository-index-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryModelRegistryStore } from "./in-memory-model-registry-store.js";
import { registerPlatformModel } from "./register-model.js";
import { runDiscoveryAgent } from "./run-discovery-agent.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_discovery",
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
    {
      path: "src/memberships/route.test.ts",
      content: "describe('route', () => {});",
    },
  ],
};

async function seedDiscoveryScenario(): Promise<{
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
      title: "Assess onboarding flow",
      type: "feature",
      riskLevel: "medium",
      ownerId: "user_owner",
      problemStatement: "Users struggle to connect repositories during onboarding.",
      targetUser: "Platform engineer",
      desiredBehavior: "Repository connection completes in one guided step.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A project without a repository",
          when: "The user connects GitHub",
          then: "The repository appears as connected",
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

describe("runDiscoveryAgent", () => {
  it("produces a repository map and assessment evidence without write tools", async () => {
    const seeded = await seedDiscoveryScenario();
    const agentRunStore = new InMemoryAgentRunStore();
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

    const result = await runDiscoveryAgent(
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

    expect(result.inputContract.allowedTools).toEqual([
      "repository.read_file",
      "repository.search",
    ]);
    expect(result.output.repositoryMap.fileCount).toBe(3);
    expect(result.output.assessmentEvidence.contextItemCount).toBeGreaterThan(0);
    expect(result.output.schemaRef).toBe("schemas/discovery-output.schema.json");

    const savedRun = await agentRunStore.findAgentRunById(result.output.agentRunId);
    expect(savedRun?.status).toBe("completed");
  });

  it("blocks discovery runs when the repository is outside the work item project", async () => {
    const seeded = await seedDiscoveryScenario();
    const projectStore = new InMemoryProjectStore();
    const repositoryStore = new InMemoryRepositoryStore();

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

    await expect(
      runDiscoveryAgent(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: foreignRepository.id,
          registeredModelId: model.id,
          seedFilePaths: ["src/memberships/route.ts"],
        },
        seeded.workItemStore,
        repositoryStore,
        seeded.repositoryIndexStore,
        modelStore,
        new InMemoryAgentRunStore(),
        seeded.contentPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
