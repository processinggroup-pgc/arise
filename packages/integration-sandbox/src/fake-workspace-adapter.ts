import {
  WorkspaceToolError,
  type GitCommitRequest,
  type GitCommitResult,
  type GitCreateBranchRequest,
  type GitCreateBranchResult,
  type WorkspaceDiffRequest,
  type WorkspaceDiffResult,
  type WorkspacePort,
  type WorkspaceReadFileRequest,
  type WorkspaceReadFileResult,
  type WorkspaceSearchRequest,
  type WorkspaceSearchResult,
  type WorkspaceWriteFileRequest,
  type WorkspaceWriteFileResult,
} from "./workspace-port.js";

interface WorkspaceState {
  files: Map<string, string>;
  originalFiles: Map<string, string>;
  branchName: string;
  commits: GitCommitResult[];
  commitCounter: number;
}

export class FakeWorkspaceAdapter implements WorkspacePort {
  private readonly workspaces = new Map<string, WorkspaceState>();

  seedWorkspace(sandboxSessionId: string, files: Record<string, string>, branchName: string): void {
    const normalizedFiles = new Map<string, string>();
    for (const [path, content] of Object.entries(files)) {
      normalizedFiles.set(path.replace(/\\/gu, "/"), content);
    }

    this.workspaces.set(sandboxSessionId, {
      files: new Map(normalizedFiles),
      originalFiles: new Map(normalizedFiles),
      branchName,
      commits: [],
      commitCounter: 0,
    });
  }

  private getWorkspace(sandboxSessionId: string): WorkspaceState {
    const workspace = this.workspaces.get(sandboxSessionId);
    if (workspace === undefined) {
      throw new WorkspaceToolError("Workspace session was not found");
    }

    return workspace;
  }

  readFile(request: WorkspaceReadFileRequest): Promise<WorkspaceReadFileResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    const content = workspace.files.get(request.path);
    if (content === undefined) {
      return Promise.reject(new WorkspaceToolError("Workspace file was not found"));
    }

    return Promise.resolve({
      path: request.path,
      content,
    });
  }

  search(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    const query = request.query.toLowerCase();
    const matches: WorkspaceSearchResult["matches"] = [];

    for (const [path, content] of workspace.files.entries()) {
      const lines = content.split("\n");
      for (const [index, line] of lines.entries()) {
        if (line.toLowerCase().includes(query)) {
          matches.push({
            path,
            line: index + 1,
            excerpt: line.trim(),
          });
        }
      }
    }

    return Promise.resolve({
      query: request.query,
      matches,
    });
  }

  writeFile(request: WorkspaceWriteFileRequest): Promise<WorkspaceWriteFileResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    workspace.files.set(request.path, request.content);

    return Promise.resolve({
      path: request.path,
      bytesWritten: Buffer.byteLength(request.content, "utf8"),
    });
  }

  diff(request: WorkspaceDiffRequest): Promise<WorkspaceDiffResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    const before = workspace.originalFiles.get(request.path) ?? "";
    const after = workspace.files.get(request.path) ?? "";

    return Promise.resolve({
      path: request.path,
      before,
      after,
    });
  }

  createBranch(request: GitCreateBranchRequest): Promise<GitCreateBranchResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    workspace.branchName = request.branchName;

    return Promise.resolve({
      branchName: request.branchName,
    });
  }

  commit(request: GitCommitRequest): Promise<GitCommitResult> {
    const workspace = this.getWorkspace(request.sandboxSessionId);
    workspace.commitCounter += 1;
    const commitId = `fake_commit_${String(workspace.commitCounter)}`;
    const result = {
      commitId,
      message: request.message,
    };
    workspace.commits.push(result);

    for (const [path, content] of workspace.files.entries()) {
      workspace.originalFiles.set(path, content);
    }

    return Promise.resolve(result);
  }
}
