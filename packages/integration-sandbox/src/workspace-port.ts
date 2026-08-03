export interface WorkspaceReadFileRequest {
  sandboxSessionId: string;
  path: string;
}

export interface WorkspaceReadFileResult {
  path: string;
  content: string;
}

export interface WorkspaceSearchRequest {
  sandboxSessionId: string;
  query: string;
}

export interface WorkspaceSearchMatch {
  path: string;
  line: number;
  excerpt: string;
}

export interface WorkspaceSearchResult {
  query: string;
  matches: WorkspaceSearchMatch[];
}

export interface WorkspaceWriteFileRequest {
  sandboxSessionId: string;
  path: string;
  content: string;
}

export interface WorkspaceWriteFileResult {
  path: string;
  bytesWritten: number;
}

export interface WorkspaceDiffRequest {
  sandboxSessionId: string;
  path: string;
}

export interface WorkspaceDiffResult {
  path: string;
  before: string;
  after: string;
}

export interface GitCreateBranchRequest {
  sandboxSessionId: string;
  branchName: string;
}

export interface GitCreateBranchResult {
  branchName: string;
}

export interface GitCommitRequest {
  sandboxSessionId: string;
  message: string;
}

export interface GitCommitResult {
  commitId: string;
  message: string;
}

export interface WorkspacePort {
  seedWorkspace(sandboxSessionId: string, files: Record<string, string>, branchName: string): void;
  readFile(request: WorkspaceReadFileRequest): Promise<WorkspaceReadFileResult>;
  search(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResult>;
  writeFile(request: WorkspaceWriteFileRequest): Promise<WorkspaceWriteFileResult>;
  diff(request: WorkspaceDiffRequest): Promise<WorkspaceDiffResult>;
  createBranch(request: GitCreateBranchRequest): Promise<GitCreateBranchResult>;
  commit(request: GitCommitRequest): Promise<GitCommitResult>;
}

export class WorkspaceToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceToolError";
  }
}
