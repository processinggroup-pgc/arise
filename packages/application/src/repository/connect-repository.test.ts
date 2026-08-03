import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter } from "@arise/integration-github";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import {
  connectRepositoryForProject,
  ProjectScopeError,
  RepositoryAlreadyConnectedError,
} from "./connect-repository.js";
import { InMemoryRepositoryStore } from "./in-memory-repository-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_repository",
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

async function seedProject(): Promise<{
  projectId: string;
  projectStore: InMemoryProjectStore;
}> {
  const projectStore = new InMemoryProjectStore();

  const project = await createProjectForOrganization(
    {
      tenantContext,
      name: "Customer Portal",
    },
    projectStore,
    operationContext,
  );

  return {
    projectId: project.id,
    projectStore,
  };
}

describe("connectRepositoryForProject", () => {
  it("connects a GitHub repository through the fake adapter", async () => {
    const seeded = await seedProject();
    const repositoryStore = new InMemoryRepositoryStore();
    const githubPort = new FakeGitHubAdapter([githubFixture]);

    const repository = await connectRepositoryForProject(
      {
        tenantContext,
        projectId: seeded.projectId,
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
      },
      seeded.projectStore,
      repositoryStore,
      githubPort,
      operationContext,
    );

    expect(repository.fullName).toBe("PgC-git/arise");
    expect(repository.status).toBe("connected");
    expect(await repositoryStore.listRepositoriesForProject(seeded.projectId)).toEqual([
      repository,
    ]);
  });

  it("blocks duplicate repository connections within the same organization", async () => {
    const seeded = await seedProject();
    const repositoryStore = new InMemoryRepositoryStore();
    const githubPort = new FakeGitHubAdapter([githubFixture]);

    await connectRepositoryForProject(
      {
        tenantContext,
        projectId: seeded.projectId,
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
      },
      seeded.projectStore,
      repositoryStore,
      githubPort,
      operationContext,
    );

    await expect(
      connectRepositoryForProject(
        {
          tenantContext,
          projectId: seeded.projectId,
          installationId: "install_123",
          owner: "PgC-git",
          name: "arise",
        },
        seeded.projectStore,
        repositoryStore,
        githubPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(RepositoryAlreadyConnectedError);
  });

  it("blocks repository connections outside the tenant scope", async () => {
    const seeded = await seedProject();
    const repositoryStore = new InMemoryRepositoryStore();
    const githubPort = new FakeGitHubAdapter([githubFixture]);
    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      connectRepositoryForProject(
        {
          tenantContext: foreignTenant,
          projectId: seeded.projectId,
          installationId: "install_123",
          owner: "PgC-git",
          name: "arise",
        },
        seeded.projectStore,
        repositoryStore,
        githubPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ProjectScopeError);
  });
});
