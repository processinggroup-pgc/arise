import type {
  RepositoryDependency,
  RepositoryFile,
  RepositorySymbol,
  RepositoryTestMapEntry,
} from "@arise/domain";

import type { RepositoryIndexStore } from "./repository-index-store.js";

export class InMemoryRepositoryIndexStore implements RepositoryIndexStore {
  private readonly files = new Map<string, RepositoryFile>();
  private readonly symbols = new Map<string, RepositorySymbol>();
  private readonly dependencies = new Map<string, RepositoryDependency>();
  private readonly testMaps = new Map<string, RepositoryTestMapEntry>();

  listFilesForRepository(repositoryId: string): Promise<RepositoryFile[]> {
    return Promise.resolve(
      [...this.files.values()].filter((file) => file.repositoryId === repositoryId),
    );
  }

  listSymbolsForRepository(repositoryId: string): Promise<RepositorySymbol[]> {
    return Promise.resolve(
      [...this.symbols.values()].filter((symbol) => symbol.repositoryId === repositoryId),
    );
  }

  listDependenciesForRepository(repositoryId: string): Promise<RepositoryDependency[]> {
    return Promise.resolve(
      [...this.dependencies.values()].filter(
        (dependency) => dependency.repositoryId === repositoryId,
      ),
    );
  }

  listTestMapsForRepository(repositoryId: string): Promise<RepositoryTestMapEntry[]> {
    return Promise.resolve(
      [...this.testMaps.values()].filter((entry) => entry.repositoryId === repositoryId),
    );
  }

  replaceRepositoryIndex(
    repositoryId: string,
    files: RepositoryFile[],
    symbols: RepositorySymbol[],
    dependencies: RepositoryDependency[],
    testMaps: RepositoryTestMapEntry[],
  ): Promise<void> {
    for (const [id, file] of this.files) {
      if (file.repositoryId === repositoryId) {
        this.files.delete(id);
      }
    }

    for (const [id, symbol] of this.symbols) {
      if (symbol.repositoryId === repositoryId) {
        this.symbols.delete(id);
      }
    }

    for (const [id, dependency] of this.dependencies) {
      if (dependency.repositoryId === repositoryId) {
        this.dependencies.delete(id);
      }
    }

    for (const [id, entry] of this.testMaps) {
      if (entry.repositoryId === repositoryId) {
        this.testMaps.delete(id);
      }
    }

    for (const file of files) {
      this.files.set(file.id, file);
    }

    for (const symbol of symbols) {
      this.symbols.set(symbol.id, symbol);
    }

    for (const dependency of dependencies) {
      this.dependencies.set(dependency.id, dependency);
    }

    for (const entry of testMaps) {
      this.testMaps.set(entry.id, entry);
    }

    return Promise.resolve();
  }
}
