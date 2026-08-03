import type { AgentToolName } from "../agent-runtime/agent-run-contracts.js";

export const REPOSITORY_GIT_TOOL_NAMES = [
  "repository.read_file",
  "repository.search",
  "repository.write_file",
  "repository.diff",
  "git.create_branch",
  "git.commit",
] as const;

export type RepositoryGitToolName = (typeof REPOSITORY_GIT_TOOL_NAMES)[number];

export interface RepositoryReadFileArgs {
  path: string;
}

export interface RepositorySearchArgs {
  query: string;
}

export interface RepositoryWriteFileArgs {
  path: string;
  content: string;
}

export interface RepositoryDiffArgs {
  path: string;
}

export interface GitCreateBranchArgs {
  branchName: string;
}

export interface GitCommitArgs {
  message: string;
}

export type TypedRepositoryGitToolArgs =
  | { tool: "repository.read_file"; arguments: RepositoryReadFileArgs }
  | { tool: "repository.search"; arguments: RepositorySearchArgs }
  | { tool: "repository.write_file"; arguments: RepositoryWriteFileArgs }
  | { tool: "repository.diff"; arguments: RepositoryDiffArgs }
  | { tool: "git.create_branch"; arguments: GitCreateBranchArgs }
  | { tool: "git.commit"; arguments: GitCommitArgs };

export interface RepositoryReadFileResult {
  path: string;
  content: string;
}

export interface RepositorySearchMatch {
  path: string;
  line: number;
  excerpt: string;
}

export interface RepositorySearchResult {
  query: string;
  matches: RepositorySearchMatch[];
}

export interface RepositoryWriteFileResult {
  path: string;
  bytesWritten: number;
}

export interface RepositoryDiffResult {
  path: string;
  before: string;
  after: string;
}

export interface GitCreateBranchResult {
  branchName: string;
}

export interface GitCommitResult {
  commitId: string;
  message: string;
}

export type TypedRepositoryGitToolResult =
  | { tool: "repository.read_file"; result: RepositoryReadFileResult }
  | { tool: "repository.search"; result: RepositorySearchResult }
  | { tool: "repository.write_file"; result: RepositoryWriteFileResult }
  | { tool: "repository.diff"; result: RepositoryDiffResult }
  | { tool: "git.create_branch"; result: GitCreateBranchResult }
  | { tool: "git.commit"; result: GitCommitResult };

export function assertWorkspaceRelativePath(path: string): string {
  const normalized = path.trim().replace(/\\/gu, "/");

  if (normalized.length === 0) {
    throw new Error("Workspace path is required");
  }

  if (normalized.startsWith("/") || normalized.includes("\0")) {
    throw new Error("Workspace path must be relative");
  }

  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("Workspace path traversal is blocked");
  }

  return normalized;
}

function readStringField(argumentsValue: Record<string, unknown>, field: string): string {
  const value = argumentsValue[field];
  if (typeof value !== "string") {
    throw new Error(`Tool argument ${field} is required`);
  }

  return value.trim();
}

export function parseRepositoryGitToolArguments(
  tool: AgentToolName,
  argumentsValue: Record<string, unknown>,
): TypedRepositoryGitToolArgs {
  switch (tool) {
    case "repository.read_file":
      return {
        tool,
        arguments: {
          path: assertWorkspaceRelativePath(readStringField(argumentsValue, "path")),
        },
      };
    case "repository.search":
      return {
        tool,
        arguments: {
          query: readStringField(argumentsValue, "query"),
        },
      };
    case "repository.write_file": {
      const path = assertWorkspaceRelativePath(readStringField(argumentsValue, "path"));
      const content = readStringField(argumentsValue, "content");
      return {
        tool,
        arguments: { path, content },
      };
    }
    case "repository.diff":
      return {
        tool,
        arguments: {
          path: assertWorkspaceRelativePath(readStringField(argumentsValue, "path")),
        },
      };
    case "git.create_branch":
      return {
        tool,
        arguments: {
          branchName: readStringField(argumentsValue, "branchName"),
        },
      };
    case "git.commit":
      return {
        tool,
        arguments: {
          message: readStringField(argumentsValue, "message"),
        },
      };
    default:
      throw new Error("Tool is not a repository or git tool");
  }
}

export function isRepositoryGitTool(tool: string): tool is RepositoryGitToolName {
  return (REPOSITORY_GIT_TOOL_NAMES as readonly string[]).includes(tool);
}

export function buildToolActionEvidenceRef(executionSessionId: string, toolCallId: string): string {
  return `execution/${executionSessionId}/${toolCallId}.json`;
}
