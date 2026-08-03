import { describe, expect, it } from "vitest";

import { createTenantContext, createRepository } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";
import { FakeSandboxAdapter } from "@arise/integration-sandbox";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository } from "../repository-intelligence/index-repository.js";
import { InMemoryRepositoryIndexStore } from "../repository-intelligence/in-memory-repository-index-store.js";
import {
  ExecutionSessionScopeError,
  provisionExecutionSession,
} from "./provision-execution-session.js";
import { InMemoryExecutionSessionStore } from "./in-memory-execution-session-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_execution",
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

describe("provisionExecutionSession", () => {
  it("provisions a fake ephemeral sandbox for a tenant-scoped work item", async () => {
    const seeded = await seedExecutionScenario();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const sandboxPort = new FakeSandboxAdapter();

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

    expect(session.state).toBe("ready");
    expect(session.sandboxProvider).toBe("fake");
    expect(session.workspacePath).toContain("PgC-git/arise");
    expect(session.limits.networkEgressAllowed).toBe(false);
    expect(await executionSessionStore.listExecutionSessionsForWorkItem(seeded.workItemId)).toHaveLength(
      1,
    );
  });

  it("blocks provisioning when the repository is outside the work item project", async () => {
    const seeded = await seedExecutionScenario();
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

    await expect(
      provisionExecutionSession(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: foreignRepository.id,
          branch: "feature/onboarding",
        },
        seeded.workItemStore,
        repositoryStore,
        new InMemoryExecutionSessionStore(),
        new FakeSandboxAdapter(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ExecutionSessionScopeError);
  });
});
