import type { PullRequest } from "@arise/domain";

export interface PullRequestStore {
  savePullRequest(pullRequest: PullRequest): Promise<void>;
  findPullRequestById(id: string): Promise<PullRequest | undefined>;
  findPullRequestByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<PullRequest | undefined>;
  listPullRequestsForWorkItem(workItemId: string): Promise<PullRequest[]>;
}
