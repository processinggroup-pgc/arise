import { describe, expect, it } from "vitest";

import { buildRepositoryIndex } from "./build-repository-index.js";
import { createRepositoryFile } from "./repository-file.js";
import { createRepositorySymbol } from "./repository-symbol.js";

const indexedAt = new Date("2026-08-03T12:00:00.000Z");

describe("buildRepositoryIndex", () => {
  it("indexes files and symbols from repository snapshots", () => {
    const result = buildRepositoryIndex({
      organizationId: "org_123",
      repositoryId: "repo_123",
      snapshots: [
        {
          path: "src/memberships/route.ts",
          content: "export function listMemberships() {}",
          contentHash: "hash_route",
        },
      ],
      existingFiles: [],
      existingSymbols: [],
      createId: (() => {
        let counter = 0;
        return () => `generated_${String(++counter)}`;
      })(),
      indexedAt,
    });

    expect(result.files).toHaveLength(1);
    expect(result.symbols).toEqual([
      expect.objectContaining({
        name: "listMemberships",
        kind: "function",
        line: 1,
      }),
    ]);
    expect(result.changedFilePaths).toEqual(["src/memberships/route.ts"]);
    expect(result.removedFilePaths).toEqual([]);
  });

  it("reuses unchanged files idempotently when content hash matches", () => {
    const existingFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/memberships/route.ts",
        language: "typescript",
        contentHash: "hash_route",
      },
      {
        id: "file_existing",
        indexedAt,
      },
    );
    const existingSymbol = createRepositorySymbol(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        fileId: existingFile.id,
        name: "listMemberships",
        kind: "function",
        line: 1,
      },
      {
        id: "symbol_existing",
        indexedAt,
      },
    );

    const result = buildRepositoryIndex({
      organizationId: "org_123",
      repositoryId: "repo_123",
      snapshots: [
        {
          path: "src/memberships/route.ts",
          content: "export function listMemberships() {}",
          contentHash: "hash_route",
        },
      ],
      existingFiles: [existingFile],
      existingSymbols: [existingSymbol],
      createId: () => "unused",
      indexedAt,
    });

    expect(result.files).toEqual([existingFile]);
    expect(result.symbols).toEqual([existingSymbol]);
    expect(result.unchangedFilePaths).toEqual(["src/memberships/route.ts"]);
    expect(result.changedFilePaths).toEqual([]);
  });

  it("tracks removed files when snapshots no longer include them", () => {
    const existingFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_123",
        path: "src/legacy.ts",
        language: "typescript",
        contentHash: "hash_legacy",
      },
      {
        id: "file_legacy",
        indexedAt,
      },
    );

    const result = buildRepositoryIndex({
      organizationId: "org_123",
      repositoryId: "repo_123",
      snapshots: [],
      existingFiles: [existingFile],
      existingSymbols: [],
      createId: () => "generated",
      indexedAt,
    });

    expect(result.removedFilePaths).toEqual(["src/legacy.ts"]);
    expect(result.files).toEqual([]);
  });
});
