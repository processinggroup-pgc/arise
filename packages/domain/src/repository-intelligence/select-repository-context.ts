import type { RepositoryDependency } from "./repository-dependency.js";
import type { RepositoryFile } from "./repository-file.js";
import type { RepositorySymbol } from "./repository-symbol.js";
import type { RepositoryTestMapEntry } from "./repository-test-map.js";

export interface RepositoryContextSelectionInput {
  seedFilePaths: string[];
  files: RepositoryFile[];
  symbols: RepositorySymbol[];
  dependencies: RepositoryDependency[];
  testMaps: RepositoryTestMapEntry[];
  maxItems: number;
}

export interface SelectedContextFile {
  path: string;
  rank: number;
  reason: string;
}

export interface RepositoryContextSelection {
  files: SelectedContextFile[];
  symbols: RepositorySymbol[];
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/gu, "/");
}

function buildFilePathIndex(files: RepositoryFile[]): Map<string, RepositoryFile> {
  return new Map(files.map((file) => [file.path, file]));
}

export function selectRepositoryContext(
  input: RepositoryContextSelectionInput,
): RepositoryContextSelection {
  const maxItems = Math.max(1, input.maxItems);
  const filesByPath = buildFilePathIndex(input.files);
  const selected = new Map<string, SelectedContextFile>();

  const addSelection = (path: string, rank: number, reason: string): void => {
    const normalized = normalizePath(path);
    if (!filesByPath.has(normalized)) {
      return;
    }

    const existing = selected.get(normalized);
    if (existing === undefined || rank < existing.rank) {
      selected.set(normalized, { path: normalized, rank, reason });
    }
  };

  for (const seedPath of input.seedFilePaths) {
    addSelection(seedPath, 1, "seed file");
  }

  for (const dependency of input.dependencies) {
    const sourceFile = input.files.find((file) => file.id === dependency.sourceFileId);
    if (sourceFile === undefined) {
      continue;
    }

    if (!input.seedFilePaths.map(normalizePath).includes(sourceFile.path)) {
      continue;
    }

    if (dependency.kind === "relative_import") {
      addSelection(dependency.target, 2, `imported by ${sourceFile.path}`);
    }
  }

  for (const testMap of input.testMaps) {
    if (input.seedFilePaths.map(normalizePath).includes(normalizePath(testMap.testedFilePath))) {
      const testFile = input.files.find((file) => file.id === testMap.testFileId);
      if (testFile !== undefined) {
        addSelection(testFile.path, 3, `tests ${testMap.testedFilePath}`);
      }
    }
  }

  const files = [...selected.values()]
    .sort((left, right) => left.rank - right.rank || left.path.localeCompare(right.path))
    .slice(0, maxItems);

  const selectedPaths = new Set(files.map((file) => file.path));
  const fileIds = new Set(
    input.files.filter((file) => selectedPaths.has(file.path)).map((file) => file.id),
  );
  const symbols = input.symbols
    .filter((symbol) => fileIds.has(symbol.fileId))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.line - right.line ||
        left.id.localeCompare(right.id),
    );

  return {
    files,
    symbols,
  };
}
