export interface GitHubRepositoryLookup {
  installationId: string;
  owner: string;
  name: string;
}

export interface GitHubRepositoryMetadata {
  externalId: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  private: boolean;
}

export interface GitHubRepositoryPort {
  getRepository(lookup: GitHubRepositoryLookup): Promise<GitHubRepositoryMetadata>;
}

export class GitHubRepositoryNotFoundError extends Error {
  constructor(
    readonly lookup: GitHubRepositoryLookup,
    message = "GitHub repository was not found",
  ) {
    super(message);
    this.name = "GitHubRepositoryNotFoundError";
  }
}
