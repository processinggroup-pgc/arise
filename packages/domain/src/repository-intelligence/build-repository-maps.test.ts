import { describe, expect, it } from "vitest";

import { buildRepositoryMaps } from "./build-repository-maps.js";
import { createRepositoryFile } from "./repository-file.js";
import { createRepositoryDependency } from "./repository-dependency.js";
import { createRepositoryTestMapEntry } from "./repository-test-map.js";

const indexedAt = new Date("2026-08-03T12:00:00.000Z");

describe("buildRepositoryMaps", () => {
  it("builds dependency and test maps from indexed files", () => {
    const routeFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/route.ts",
        language: "typescript",
        contentHash: "hash_route",
      },
      { id: "file_route", indexedAt },
    );
    const serviceFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/service.ts",
        language: "typescript",
        contentHash: "hash_service",
      },
      { id: "file_service", indexedAt },
    );
    const testFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/route.test.ts",
        language: "typescript",
        contentHash: "hash_test",
      },
      { id: "file_test", indexedAt },
    );

    const result = buildRepositoryMaps({
      organizationId: "org_123",
      repositoryId: "repo_123",
      files: [routeFile, serviceFile, testFile],
      snapshotsByPath: new Map([
        [
          "src/memberships/route.ts",
          {
            path: "src/memberships/route.ts",
            content: 'import { listMemberships } from "./service";',
            contentHash: "hash_route",
          },
        ],
        [
          "src/memberships/route.test.ts",
          {
            path: "src/memberships/route.test.ts",
            content: "describe('route', () => {});",
            contentHash: "hash_test",
          },
        ],
      ]),
      unchangedFilePaths: [],
      existingDependencies: [],
      existingTestMaps: [],
      createId: (() => {
        let counter = 0;
        return () => `generated_${String(++counter)}`;
      })(),
      indexedAt,
    });

    expect(result.dependencies).toEqual([
      expect.objectContaining({
        sourceFileId: "file_route",
        target: "src/memberships/service.ts",
        kind: "relative_import",
      }),
    ]);
    expect(result.testMaps).toEqual([
      expect.objectContaining({
        testFileId: "file_test",
        testedFilePath: "src/memberships/route.ts",
      }),
    ]);
  });

  it("reuses dependency and test maps for unchanged files", () => {
    const routeFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/route.ts",
        language: "typescript",
        contentHash: "hash_route",
      },
      { id: "file_route", indexedAt },
    );
    const existingDependency = createRepositoryDependency(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        sourceFileId: "file_route",
        target: "src/memberships/service.ts",
        kind: "relative_import",
        line: 1,
      },
      { id: "dep_existing", indexedAt },
    );
    const testFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/route.test.ts",
        language: "typescript",
        contentHash: "hash_test",
      },
      { id: "file_test", indexedAt },
    );
    const existingTestMap = createRepositoryTestMapEntry(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        testFileId: "file_test",
        testedFilePath: "src/memberships/route.ts",
      },
      { id: "map_existing", indexedAt },
    );

    const result = buildRepositoryMaps({
      organizationId: "org_123",
      repositoryId: "repo_123",
      files: [routeFile, testFile],
      snapshotsByPath: new Map(),
      unchangedFilePaths: ["src/memberships/route.ts", "src/memberships/route.test.ts"],
      existingDependencies: [existingDependency],
      existingTestMaps: [existingTestMap],
      createId: () => "unused",
      indexedAt,
    });

    expect(result.dependencies).toEqual([existingDependency]);
    expect(result.testMaps).toEqual([existingTestMap]);
  });
});
