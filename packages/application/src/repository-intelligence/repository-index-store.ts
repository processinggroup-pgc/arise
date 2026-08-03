import type {
  RepositoryDependency,
  RepositoryFile,
  RepositorySymbol,
  RepositoryTestMapEntry,
} from "@arise/domain";

export interface RepositoryIndexStore {
  listFilesForRepository(repositoryId: string): Promise<RepositoryFile[]>;
  listSymbolsForRepository(repositoryId: string): Promise<RepositorySymbol[]>;
  listDependenciesForRepository(repositoryId: string): Promise<RepositoryDependency[]>;
  listTestMapsForRepository(repositoryId: string): Promise<RepositoryTestMapEntry[]>;
  replaceRepositoryIndex(
    repositoryId: string,
    files: RepositoryFile[],
    symbols: RepositorySymbol[],
    dependencies: RepositoryDependency[],
    testMaps: RepositoryTestMapEntry[],
  ): Promise<void>;
}
