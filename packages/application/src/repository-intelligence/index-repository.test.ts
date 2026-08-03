import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubContentAdapter } from "@arise/integration-github";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { indexRepository, RepositoryScopeError } from "./index-repository.js";
import { InMemoryRepositoryIndexStore } from "./in-memory-repository-index-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_index",
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

async function seedConnectedRepository(): Promise<{
  repositoryId: string;
  repositoryStore: InMemoryRepositoryStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const githubPort = new FakeGitHubAdapter([githubFixture]);

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
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

  return {
    repositoryId: repository.id,
    repositoryStore,
  };
}

describe("indexRepository", () => {
  it("indexes files and symbols from the fake GitHub content adapter", async () => {
    const seeded = await seedConnectedRepository();
    const repositoryIndexStore = new InMemoryRepositoryIndexStore();
    const contentPort = new FakeGitHubContentAdapter([contentFixture]);

    const result = await indexRepository(
      {
        tenantContext,
        repositoryId: seeded.repositoryId,
      },
      seeded.repositoryStore,
      repositoryIndexStore,
      contentPort,
      operationContext,
    );

    expect(result.files).toHaveLength(3);
    expect(result.symbols.map((symbol) => symbol.name)).toEqual([
      "listMemberships",
      "MembershipService",
    ]);
    expect(result.dependencies).toEqual([
      expect.objectContaining({
        target: "src/memberships/service.ts",
        kind: "relative_import",
      }),
    ]);
    expect(result.testMaps).toEqual([
      expect.objectContaining({
        testedFilePath: "src/memberships/route.ts",
      }),
    ]);
    expect(result.changedFilePaths).toEqual([
      "src/memberships/route.ts",
      "src/memberships/service.ts",
      "src/memberships/route.test.ts",
    ]);
    expect(
      await repositoryIndexStore.listDependenciesForRepository(seeded.repositoryId),
    ).toHaveLength(1);
    expect(await repositoryIndexStore.listTestMapsForRepository(seeded.repositoryId)).toHaveLength(
      1,
    );
  });

  it("re-indexes idempotently when file content is unchanged", async () => {
    const seeded = await seedConnectedRepository();
    const repositoryIndexStore = new InMemoryRepositoryIndexStore();
    const contentPort = new FakeGitHubContentAdapter([contentFixture]);

    const first = await indexRepository(
      {
        tenantContext,
        repositoryId: seeded.repositoryId,
      },
      seeded.repositoryStore,
      repositoryIndexStore,
      contentPort,
      operationContext,
    );

    const second = await indexRepository(
      {
        tenantContext,
        repositoryId: seeded.repositoryId,
      },
      seeded.repositoryStore,
      repositoryIndexStore,
      contentPort,
      operationContext,
    );

    expect(second.changedFilePaths).toEqual([]);
    expect(second.unchangedFilePaths).toEqual([
      "src/memberships/route.ts",
      "src/memberships/service.ts",
      "src/memberships/route.test.ts",
    ]);
    expect(second.files).toEqual(first.files);
    expect(second.symbols).toEqual(first.symbols);
    expect(second.dependencies).toEqual(first.dependencies);
    expect(second.testMaps).toEqual(first.testMaps);
  });

  it("blocks indexing outside the tenant scope", async () => {
    const seeded = await seedConnectedRepository();
    const repositoryIndexStore = new InMemoryRepositoryIndexStore();
    const contentPort = new FakeGitHubContentAdapter([contentFixture]);
    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      indexRepository(
        {
          tenantContext: foreignTenant,
          repositoryId: seeded.repositoryId,
        },
        seeded.repositoryStore,
        repositoryIndexStore,
        contentPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(RepositoryScopeError);
  });
});
