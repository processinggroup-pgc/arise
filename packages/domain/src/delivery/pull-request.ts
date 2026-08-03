export const PULL_REQUEST_STATUSES = ["open", "closed", "merged"] as const;
export type PullRequestStatus = (typeof PULL_REQUEST_STATUSES)[number];

export const GITHUB_CHECK_STATUSES = ["queued", "in_progress", "completed"] as const;
export type GitHubCheckStatus = (typeof GITHUB_CHECK_STATUSES)[number];

export const GITHUB_CHECK_CONCLUSIONS = [
  "success",
  "failure",
  "neutral",
  "cancelled",
  "skipped",
  "timed_out",
  "action_required",
] as const;
export type GitHubCheckConclusion = (typeof GITHUB_CHECK_CONCLUSIONS)[number];

export interface PullRequest {
  id: string;
  organizationId: string;
  repositoryId: string;
  workItemId: string;
  externalId: string;
  number: number;
  url: string;
  status: PullRequestStatus;
  headBranch: string;
  baseBranch: string;
  createdAt: Date;
}

export interface PullRequestCheckSummary {
  externalId: string;
  name: string;
  status: GitHubCheckStatus;
  conclusion: GitHubCheckConclusion | null;
  required: boolean;
}

export interface PullRequestCheckEvaluation {
  passed: boolean;
  failedRequiredChecks: string[];
  pendingRequiredChecks: string[];
}

export interface CreatePullRequestInput {
  organizationId: string;
  repositoryId: string;
  workItemId: string;
  externalId: string;
  number: number;
  url: string;
  headBranch: string;
  baseBranch: string;
  status?: PullRequestStatus;
}

export interface CreatePullRequestMetadata {
  id: string;
  createdAt: Date;
}

function assertPullRequestStatus(status: string): PullRequestStatus {
  if (!(PULL_REQUEST_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Pull request status is invalid");
  }

  return status as PullRequestStatus;
}

function isSuccessfulCheckConclusion(conclusion: string | null): boolean {
  return conclusion === "success" || conclusion === "neutral" || conclusion === "skipped";
}

export function createPullRequest(
  input: CreatePullRequestInput,
  metadata: CreatePullRequestMetadata,
): PullRequest {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const workItemId = input.workItemId.trim();
  const externalId = input.externalId.trim();
  const url = input.url.trim();
  const headBranch = input.headBranch.trim();
  const baseBranch = input.baseBranch.trim();

  if (
    organizationId.length === 0 ||
    repositoryId.length === 0 ||
    workItemId.length === 0 ||
    externalId.length === 0
  ) {
    throw new Error("Pull request identifiers are required");
  }

  if (url.length === 0 || headBranch.length === 0 || baseBranch.length === 0) {
    throw new Error("Pull request url and branches are required");
  }

  if (input.number < 1) {
    throw new Error("Pull request number is invalid");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    workItemId,
    externalId,
    number: input.number,
    url,
    status: assertPullRequestStatus(input.status ?? "open"),
    headBranch,
    baseBranch,
    createdAt: metadata.createdAt,
  };
}

export function evaluatePullRequestChecks(
  checks: PullRequestCheckSummary[],
): PullRequestCheckEvaluation {
  const failedRequiredChecks: string[] = [];
  const pendingRequiredChecks: string[] = [];

  for (const check of checks) {
    if (!check.required) {
      continue;
    }

    if (check.status !== "completed") {
      pendingRequiredChecks.push(check.name);
      continue;
    }

    if (!isSuccessfulCheckConclusion(check.conclusion)) {
      failedRequiredChecks.push(check.name);
    }
  }

  return {
    passed: failedRequiredChecks.length === 0 && pendingRequiredChecks.length === 0,
    failedRequiredChecks,
    pendingRequiredChecks,
  };
}

export function mapGitHubChecksToSummaries(
  checks: Array<{
    externalId: string;
    name: string;
    status: GitHubCheckStatus;
    conclusion: GitHubCheckConclusion | null;
    required: boolean;
  }>,
): PullRequestCheckSummary[] {
  return checks.map((check) => ({
    externalId: check.externalId,
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
    required: check.required,
  }));
}
