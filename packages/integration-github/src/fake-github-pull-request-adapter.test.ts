import { describe, expect, it } from "vitest";

import { GitHubPullRequestError } from "./github-pull-request-port.js";
import { FakeGitHubPullRequestAdapter } from "./fake-github-pull-request-adapter.js";

describe("FakeGitHubPullRequestAdapter", () => {
  it("opens a pull request and returns provider metadata", async () => {
    const adapter = new FakeGitHubPullRequestAdapter();

    const record = await adapter.openPullRequest({
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
      headBranch: "feature/onboarding",
      baseBranch: "main",
      title: "Improve membership onboarding",
      body: "Implements onboarding workflow changes.",
      idempotencyKey: "pr_key_1",
    });

    expect(record.number).toBeGreaterThan(0);
    expect(record.url).toContain("/pull/");
    expect(record.status).toBe("open");
  });

  it("replays the same pull request for an idempotency key", async () => {
    const adapter = new FakeGitHubPullRequestAdapter();
    const request = {
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
      headBranch: "feature/onboarding",
      baseBranch: "main",
      title: "Improve membership onboarding",
      body: "Implements onboarding workflow changes.",
      idempotencyKey: "pr_key_1",
    };

    const first = await adapter.openPullRequest(request);
    const second = await adapter.openPullRequest(request);

    expect(second.externalId).toBe(first.externalId);
    expect(second.number).toBe(first.number);
  });

  it("reads required and optional check runs for a pull request", async () => {
    const adapter = new FakeGitHubPullRequestAdapter([
      {
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
        pullRequestNumber: 42,
        checks: [
          {
            externalId: "check_quality",
            name: "quality",
            status: "completed",
            conclusion: "success",
            detailsUrl: "https://github.com/PgC-git/arise/runs/1",
            required: true,
          },
          {
            externalId: "check_preview",
            name: "preview",
            status: "completed",
            conclusion: "failure",
            detailsUrl: "https://github.com/PgC-git/arise/runs/2",
            required: false,
          },
        ],
      },
    ]);

    const checks = await adapter.readChecks({
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
      pullRequestNumber: 42,
    });

    expect(checks).toHaveLength(2);
    expect(checks.some((check) => check.name === "quality" && check.required)).toBe(true);
  });

  it("rejects check reads when the pull request is unknown", async () => {
    const adapter = new FakeGitHubPullRequestAdapter();

    await expect(
      adapter.readChecks({
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
        pullRequestNumber: 999,
      }),
    ).rejects.toBeInstanceOf(GitHubPullRequestError);
  });
});
