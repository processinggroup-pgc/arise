export interface VercelProjectEnvironmentVariable {
  key: string;
  value: string;
  target: Array<"production" | "preview" | "development">;
}

export interface VercelGitRepositoryLink {
  type: "github";
  repo: string;
}

export interface CreateVercelProjectRequest {
  name: string;
  framework?: string;
  rootDirectory?: string;
  gitRepository?: VercelGitRepositoryLink;
  environmentVariables?: VercelProjectEnvironmentVariable[];
}

export interface VercelProjectRecord {
  projectId: string;
  projectName: string;
  projectUrl: string;
}

export interface ValidateVercelCredentialsRequest {
  teamId: string;
}

export interface VercelProjectPort {
  validateCredentials(request: ValidateVercelCredentialsRequest): Promise<void>;
  createProject(request: CreateVercelProjectRequest): Promise<VercelProjectRecord>;
}

export class VercelProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VercelProjectError";
  }
}
