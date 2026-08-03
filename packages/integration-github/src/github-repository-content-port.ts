import type { GitHubRepositoryLookup } from "./github-repository-port.js";

export interface GitHubRepositoryFile {
  path: string;
  content: string;
}

export interface GitHubRepositoryContentPort {
  listRepositoryFiles(lookup: GitHubRepositoryLookup): Promise<GitHubRepositoryFile[]>;
}
