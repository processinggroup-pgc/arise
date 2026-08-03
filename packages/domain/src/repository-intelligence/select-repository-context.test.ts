import { describe, expect, it } from "vitest";

import { createRepositoryFile } from "./repository-file.js";
import { createRepositoryDependency } from "./repository-dependency.js";
import { createRepositorySymbol } from "./repository-symbol.js";
import { createRepositoryTestMapEntry } from "./repository-test-map.js";
import { selectRepositoryContext } from "./select-repository-context.js";

const indexedAt = new Date("2026-08-03T12:00:00.000Z");

describe("selectRepositoryContext", () => {
  it("selects seed files, imported dependencies and related tests by rank", () => {
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

    const selection = selectRepositoryContext({
      seedFilePaths: ["src/memberships/route.ts"],
      files: [routeFile, serviceFile, testFile],
      symbols: [
        createRepositorySymbol(
          {
            organizationId: "org_123",
            repositoryId: "repo_123",
            fileId: routeFile.id,
            name: "listMemberships",
            kind: "function",
            line: 2,
          },
          { id: "symbol_route", indexedAt },
        ),
      ],
      dependencies: [
        createRepositoryDependency(
          {
            organizationId: "org_123",
            repositoryId: "repo_123",
            sourceFileId: routeFile.id,
            target: "src/memberships/service.ts",
            kind: "relative_import",
            line: 1,
          },
          { id: "dep_service", indexedAt },
        ),
      ],
      testMaps: [
        createRepositoryTestMapEntry(
          {
            organizationId: "org_123",
            repositoryId: "repo_123",
            testFileId: testFile.id,
            testedFilePath: "src/memberships/route.ts",
          },
          { id: "map_route", indexedAt },
        ),
      ],
      maxItems: 5,
    });

    expect(selection.files.map((file) => file.path)).toEqual([
      "src/memberships/route.ts",
      "src/memberships/service.ts",
      "src/memberships/route.test.ts",
    ]);
    expect(selection.files.map((file) => file.rank)).toEqual([1, 2, 3]);
    expect(selection.symbols.map((symbol) => symbol.name)).toEqual(["listMemberships"]);
  });
});
