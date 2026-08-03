import { createHash } from "node:crypto";

import {
  buildRepositoryIndex,
  buildRepositoryMaps,
  type RepositoryDependency,
  type RepositoryFile,
  type RepositorySymbol,
  type RepositoryTestMapEntry,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { RepositoryIndexStore } from "./repository-index-store.js";

export interface IndexRepositoryCommand {
  tenantContext: TenantContext;
  repositoryId: string;
}

export interface IndexRepositoryResult {
  files: RepositoryFile[];
  symbols: RepositorySymbol[];
  dependencies: RepositoryDependency[];
  testMaps: RepositoryTestMapEntry[];
  changedFilePaths: string[];
  unchangedFilePaths: string[];
  removedFilePaths: string[];
}

export class RepositoryScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryScopeError";
  }
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function parseRepositoryFullName(fullName: string): { owner: string; name: string } {
  const [owner = "", name = ""] = fullName.split("/");
  return { owner, name };
}

export async function indexRepository(
  command: IndexRepositoryCommand,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  contentPort: GitHubRepositoryContentPort,
  context: IdentityOperationContext,
): Promise<IndexRepositoryResult> {
  const repository = await repositoryStore.findRepositoryById(command.repositoryId);
  if (repository === undefined) {
    throw new RepositoryScopeError("Repository was not found");
  }

  if (repository.organizationId !== command.tenantContext.organizationId) {
    throw new RepositoryScopeError("Repository is outside the tenant scope");
  }

  const { owner, name } = parseRepositoryFullName(repository.fullName);
  const remoteFiles = await contentPort.listRepositoryFiles({
    installationId: repository.installationId,
    owner,
    name,
  });

  const existingFiles = await repositoryIndexStore.listFilesForRepository(repository.id);
  const existingSymbols = await repositoryIndexStore.listSymbolsForRepository(repository.id);
  const existingDependencies = await repositoryIndexStore.listDependenciesForRepository(
    repository.id,
  );
  const existingTestMaps = await repositoryIndexStore.listTestMapsForRepository(repository.id);
  const indexedAt = context.now();
  const snapshots = remoteFiles.map((file) => ({
    path: file.path,
    content: file.content,
    contentHash: hashContent(file.content),
  }));
  const snapshotsByPath = new Map(snapshots.map((snapshot) => [snapshot.path, snapshot]));

  const index = buildRepositoryIndex({
    organizationId: repository.organizationId,
    repositoryId: repository.id,
    snapshots,
    existingFiles,
    existingSymbols,
    createId: () => context.createId(),
    indexedAt,
  });

  const maps = buildRepositoryMaps({
    organizationId: repository.organizationId,
    repositoryId: repository.id,
    files: index.files,
    snapshotsByPath,
    unchangedFilePaths: index.unchangedFilePaths,
    existingDependencies,
    existingTestMaps,
    createId: () => context.createId(),
    indexedAt,
  });

  await repositoryIndexStore.replaceRepositoryIndex(
    repository.id,
    index.files,
    index.symbols,
    maps.dependencies,
    maps.testMaps,
  );

  return {
    files: index.files,
    symbols: index.symbols,
    dependencies: maps.dependencies,
    testMaps: maps.testMaps,
    changedFilePaths: index.changedFilePaths,
    unchangedFilePaths: index.unchangedFilePaths,
    removedFilePaths: index.removedFilePaths,
  };
}
