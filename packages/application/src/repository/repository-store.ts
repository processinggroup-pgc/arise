import type { Repository } from "@arise/domain";

export interface RepositoryStore {
  saveRepository(repository: Repository): Promise<void>;
  findRepositoryById(repositoryId: string): Promise<Repository | undefined>;
  findRepositoryByExternalId(
    organizationId: string,
    provider: string,
    externalId: string,
  ): Promise<Repository | undefined>;
  listRepositoriesForProject(projectId: string): Promise<Repository[]>;
}
