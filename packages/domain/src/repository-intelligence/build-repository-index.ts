import {
  createRepositoryFile,
  inferRepositoryFileLanguage,
  type RepositoryFile,
} from "./repository-file.js";
import { createRepositorySymbol, type RepositorySymbol } from "./repository-symbol.js";
import { extractSymbolsFromSource } from "./symbol-extraction.js";

export interface RepositoryFileSnapshot {
  path: string;
  content: string;
  contentHash: string;
}

export interface BuildRepositoryIndexInput {
  organizationId: string;
  repositoryId: string;
  snapshots: RepositoryFileSnapshot[];
  existingFiles: RepositoryFile[];
  existingSymbols: RepositorySymbol[];
  createId: () => string;
  indexedAt: Date;
}

export interface BuildRepositoryIndexResult {
  files: RepositoryFile[];
  symbols: RepositorySymbol[];
  changedFilePaths: string[];
  unchangedFilePaths: string[];
  removedFilePaths: string[];
}

function findExistingFile(
  existingFiles: RepositoryFile[],
  path: string,
): RepositoryFile | undefined {
  return existingFiles.find((file) => file.path === path);
}

export function buildRepositoryIndex(input: BuildRepositoryIndexInput): BuildRepositoryIndexResult {
  const files: RepositoryFile[] = [];
  const symbols: RepositorySymbol[] = [];
  const changedFilePaths: string[] = [];
  const unchangedFilePaths: string[] = [];
  const snapshotPaths = new Set(input.snapshots.map((snapshot) => snapshot.path.trim()));

  for (const snapshot of input.snapshots) {
    const path = snapshot.path.trim().replace(/\\/gu, "/");
    const existing = findExistingFile(input.existingFiles, path);

    if (existing !== undefined && existing.contentHash === snapshot.contentHash) {
      files.push(existing);
      unchangedFilePaths.push(path);
      symbols.push(...input.existingSymbols.filter((symbol) => symbol.fileId === existing.id));
      continue;
    }

    const file = createRepositoryFile(
      {
        organizationId: input.organizationId,
        repositoryId: input.repositoryId,
        path,
        language: inferRepositoryFileLanguage(path),
        contentHash: snapshot.contentHash,
      },
      {
        id: input.createId(),
        indexedAt: input.indexedAt,
      },
    );

    files.push(file);
    changedFilePaths.push(path);

    for (const extracted of extractSymbolsFromSource(snapshot.content)) {
      symbols.push(
        createRepositorySymbol(
          {
            organizationId: input.organizationId,
            repositoryId: input.repositoryId,
            fileId: file.id,
            name: extracted.name,
            kind: extracted.kind,
            line: extracted.line,
          },
          {
            id: input.createId(),
            indexedAt: input.indexedAt,
          },
        ),
      );
    }
  }

  const removedFilePaths = input.existingFiles
    .map((file) => file.path)
    .filter((path) => !snapshotPaths.has(path));

  return {
    files,
    symbols,
    changedFilePaths,
    unchangedFilePaths,
    removedFilePaths,
  };
}
