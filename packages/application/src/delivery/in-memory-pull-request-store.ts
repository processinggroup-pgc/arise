import type { PullRequest } from "@arise/domain";

import type { PullRequestStore } from "./pull-request-store.js";

export class InMemoryPullRequestStore implements PullRequestStore {
  private readonly pullRequests = new Map<string, PullRequest>();

  savePullRequest(pullRequest: PullRequest): Promise<void> {
    this.pullRequests.set(pullRequest.id, pullRequest);
    return Promise.resolve();
  }

  findPullRequestById(id: string): Promise<PullRequest | undefined> {
    return Promise.resolve(this.pullRequests.get(id));
  }

  findPullRequestByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<PullRequest | undefined> {
    return Promise.resolve(
      [...this.pullRequests.values()].find(
        (pullRequest) =>
          pullRequest.organizationId === organizationId && pullRequest.externalId === externalId,
      ),
    );
  }

  listPullRequestsForWorkItem(workItemId: string): Promise<PullRequest[]> {
    return Promise.resolve(
      [...this.pullRequests.values()]
        .filter((pullRequest) => pullRequest.workItemId === workItemId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
