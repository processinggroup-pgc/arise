import {
  evaluatePullRequestChecks,
  mapGitHubChecksToSummaries,
  type PullRequestCheckEvaluation,
  type PullRequestCheckSummary,
  type TenantContext,
} from "@arise/domain";
import type { GitHubPullRequestPort } from "@arise/integration-github";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { PullRequestStore } from "./pull-request-store.js";

export interface ReadPullRequestChecksCommand {
  tenantContext: TenantContext;
  pullRequestId: string;
}

export interface ReadPullRequestChecksResult {
  checks: PullRequestCheckSummary[];
  evaluation: PullRequestCheckEvaluation;
}

export async function readPullRequestChecks(
  command: ReadPullRequestChecksCommand,
  pullRequestStore: PullRequestStore,
  repositoryStore: RepositoryStore,
  githubPullRequestPort: GitHubPullRequestPort,
): Promise<ReadPullRequestChecksResult> {
  const pullRequest = await pullRequestStore.findPullRequestById(command.pullRequestId);
  if (pullRequest === undefined) {
    throw new AgentRunScopeError("Pull request was not found");
  }

  if (pullRequest.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Pull request is outside the tenant scope");
  }

  const repository = await repositoryStore.findRepositoryById(pullRequest.repositoryId);
  if (repository === undefined) {
    throw new AgentRunScopeError("Repository was not found");
  }

  const [owner, name] = repository.fullName.split("/");
  if (owner === undefined || name === undefined || owner.length === 0 || name.length === 0) {
    throw new AgentRunScopeError("Repository full name is invalid");
  }

  const checks = await githubPullRequestPort.readChecks({
    installationId: repository.installationId,
    owner,
    name,
    pullRequestNumber: pullRequest.number,
  });

  const summaries = mapGitHubChecksToSummaries(checks);

  return {
    checks: summaries,
    evaluation: evaluatePullRequestChecks(summaries),
  };
}
