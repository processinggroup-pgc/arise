import type { Repository } from "@arise/domain";

import type { RepositoryStore } from "./repository-store.js";

export class InMemoryRepositoryStore implements RepositoryStore {
  private readonly repositories = new Map<string, Repository>();

  saveRepository(repository: Repository): Promise<void> {
    this.repositories.set(repository.id, repository);
    return Promise.resolve();
  }

  findRepositoryById(repositoryId: string): Promise<Repository | undefined> {
    return Promise.resolve(this.repositories.get(repositoryId));
  }

  findRepositoryByExternalId(
    organizationId: string,
    provider: string,
    externalId: string,
  ): Promise<Repository | undefined> {
    return Promise.resolve(
      [...this.repositories.values()].find(
        (repository) =>
          repository.organizationId === organizationId &&
          repository.provider === provider &&
          repository.externalId === externalId,
      ),
    );
  }

  listRepositoriesForProject(projectId: string): Promise<Repository[]> {
    return Promise.resolve(
      [...this.repositories.values()].filter((repository) => repository.projectId === projectId),
    );
  }
}
