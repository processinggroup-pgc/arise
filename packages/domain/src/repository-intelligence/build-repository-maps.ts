import { extractDependenciesFromSource } from "./dependency-extraction.js";
import { type RepositoryFile } from "./repository-file.js";
import { createRepositoryDependency, type RepositoryDependency } from "./repository-dependency.js";
import {
  createRepositoryTestMapEntry,
  inferTestedFilePath,
  isTestFilePath,
  type RepositoryTestMapEntry,
} from "./repository-test-map.js";
import type { RepositoryFileSnapshot } from "./build-repository-index.js";

export interface BuildRepositoryMapsInput {
  organizationId: string;
  repositoryId: string;
  files: RepositoryFile[];
  snapshotsByPath: Map<string, RepositoryFileSnapshot>;
  unchangedFilePaths: readonly string[];
  existingDependencies: RepositoryDependency[];
  existingTestMaps: RepositoryTestMapEntry[];
  createId: () => string;
  indexedAt: Date;
}

export interface BuildRepositoryMapsResult {
  dependencies: RepositoryDependency[];
  testMaps: RepositoryTestMapEntry[];
}

export function buildRepositoryMaps(input: BuildRepositoryMapsInput): BuildRepositoryMapsResult {
  const knownPaths = new Set(input.files.map((file) => file.path));
  const unchangedPaths = new Set(input.unchangedFilePaths);
  const dependencies: RepositoryDependency[] = [];
  const testMaps: RepositoryTestMapEntry[] = [];

  for (const file of input.files) {
    if (unchangedPaths.has(file.path)) {
      dependencies.push(
        ...input.existingDependencies.filter((dependency) => dependency.sourceFileId === file.id),
      );

      if (isTestFilePath(file.path)) {
        testMaps.push(...input.existingTestMaps.filter((entry) => entry.testFileId === file.id));
      }

      continue;
    }

    const snapshot = input.snapshotsByPath.get(file.path);
    if (snapshot !== undefined) {
      for (const extracted of extractDependenciesFromSource(
        snapshot.content,
        file.path,
        knownPaths,
      )) {
        dependencies.push(
          createRepositoryDependency(
            {
              organizationId: input.organizationId,
              repositoryId: input.repositoryId,
              sourceFileId: file.id,
              target: extracted.target,
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

    if (isTestFilePath(file.path)) {
      const testedFilePath = inferTestedFilePath(file.path);
      if (testedFilePath !== null && knownPaths.has(testedFilePath)) {
        testMaps.push(
          createRepositoryTestMapEntry(
            {
              organizationId: input.organizationId,
              repositoryId: input.repositoryId,
              testFileId: file.id,
              testedFilePath,
            },
            {
              id: input.createId(),
              indexedAt: input.indexedAt,
            },
          ),
        );
      }
    }
  }

  return {
    dependencies,
    testMaps,
  };
}
