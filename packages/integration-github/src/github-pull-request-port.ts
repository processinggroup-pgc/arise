export interface OpenGitHubPullRequestRequest {
  installationId: string;
  owner: string;
  name: string;
  headBranch: string;
  baseBranch: string;
  title: string;
  body: string;
  idempotencyKey: string;
}

export interface GitHubPullRequestRecord {
  externalId: string;
  number: number;
  url: string;
  status: "open" | "closed" | "merged";
  headBranch: string;
  baseBranch: string;
}

export interface ReadGitHubPullRequestChecksRequest {
  installationId: string;
  owner: string;
  name: string;
  pullRequestNumber: number;
}

export interface GitHubPullRequestCheckRun {
  externalId: string;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  detailsUrl: string;
  required: boolean;
}

export interface GitHubPullRequestPort {
  openPullRequest(request: OpenGitHubPullRequestRequest): Promise<GitHubPullRequestRecord>;
  readChecks(request: ReadGitHubPullRequestChecksRequest): Promise<GitHubPullRequestCheckRun[]>;
}

export class GitHubPullRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubPullRequestError";
  }
}
