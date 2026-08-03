import { describe, expect, it } from "vitest";

import {
  createPullRequest,
  evaluatePullRequestChecks,
  type PullRequestCheckSummary,
} from "./pull-request.js";

describe("pull request delivery", () => {
  it("creates a tenant-scoped pull request record", () => {
    const pullRequest = createPullRequest(
      {
        organizationId: "org_123",
        repositoryId: "repo_1",
        workItemId: "work_item_1",
        externalId: "pr_123",
        number: 42,
        url: "https://github.com/PgC-git/arise/pull/42",
        headBranch: "feature/onboarding",
        baseBranch: "main",
      },
      {
        id: "pull_request_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(pullRequest.status).toBe("open");
    expect(pullRequest.number).toBe(42);
  });

  it("passes when all required checks succeed", () => {
    const checks: PullRequestCheckSummary[] = [
      {
        externalId: "check_1",
        name: "quality",
        status: "completed",
        conclusion: "success",
        required: true,
      },
      {
        externalId: "check_2",
        name: "optional-preview",
        status: "completed",
        conclusion: "failure",
        required: false,
      },
    ];

    const evaluation = evaluatePullRequestChecks(checks);
    expect(evaluation.passed).toBe(true);
    expect(evaluation.failedRequiredChecks).toHaveLength(0);
  });

  it("blocks when a required check fails", () => {
    const checks: PullRequestCheckSummary[] = [
      {
        externalId: "check_1",
        name: "quality",
        status: "completed",
        conclusion: "failure",
        required: true,
      },
    ];

    const evaluation = evaluatePullRequestChecks(checks);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.failedRequiredChecks).toEqual(["quality"]);
  });
});
