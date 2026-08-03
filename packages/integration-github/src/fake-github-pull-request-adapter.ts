import {
  GitHubPullRequestError,
  type GitHubPullRequestCheckRun,
  type GitHubPullRequestPort,
  type GitHubPullRequestRecord,
  type OpenGitHubPullRequestRequest,
  type ReadGitHubPullRequestChecksRequest,
} from "./github-pull-request-port.js";

export interface FakeGitHubPullRequestChecksFixture {
  installationId: string;
  owner: string;
  name: string;
  pullRequestNumber: number;
  checks: GitHubPullRequestCheckRun[];
}

function repositoryKey(installationId: string, owner: string, name: string): string {
  return `${installationId}:${owner.trim().toLowerCase()}/${name.trim().toLowerCase()}`;
}

function checksKey(
  installationId: string,
  owner: string,
  name: string,
  pullRequestNumber: number,
): string {
  return `${repositoryKey(installationId, owner, name)}:${String(pullRequestNumber)}`;
}

export class FakeGitHubPullRequestAdapter implements GitHubPullRequestPort {
  private readonly idempotentPullRequests = new Map<string, GitHubPullRequestRecord>();
  private readonly pullRequestsByNumber = new Map<string, GitHubPullRequestRecord>();
  private readonly checkFixtures = new Map<string, GitHubPullRequestCheckRun[]>();
  private nextPullRequestNumber = 40;

  constructor(checkFixtures: FakeGitHubPullRequestChecksFixture[] = []) {
    for (const fixture of checkFixtures) {
      this.checkFixtures.set(
        checksKey(
          fixture.installationId,
          fixture.owner,
          fixture.name,
          fixture.pullRequestNumber,
        ),
        fixture.checks,
      );

      const record: GitHubPullRequestRecord = {
        externalId: `fake_pr_${String(fixture.pullRequestNumber)}`,
        number: fixture.pullRequestNumber,
        url: `https://github.com/${fixture.owner}/${fixture.name}/pull/${String(fixture.pullRequestNumber)}`,
        status: "open",
        headBranch: "feature/onboarding",
        baseBranch: "main",
      };
      this.pullRequestsByNumber.set(
        checksKey(
          fixture.installationId,
          fixture.owner,
          fixture.name,
          fixture.pullRequestNumber,
        ),
        record,
      );
    }
  }

  openPullRequest(request: OpenGitHubPullRequestRequest): Promise<GitHubPullRequestRecord> {
    const idempotencyKey = request.idempotencyKey.trim();
    if (idempotencyKey.length === 0) {
      return Promise.reject(new GitHubPullRequestError("Pull request idempotency key is required"));
    }

    const existing = this.idempotentPullRequests.get(idempotencyKey);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const number = ++this.nextPullRequestNumber;
    const record: GitHubPullRequestRecord = {
      externalId: `fake_pr_${String(number)}`,
      number,
      url: `https://github.com/${request.owner}/${request.name}/pull/${String(number)}`,
      status: "open",
      headBranch: request.headBranch.trim(),
      baseBranch: request.baseBranch.trim(),
    };

    this.idempotentPullRequests.set(idempotencyKey, record);
    this.pullRequestsByNumber.set(
      checksKey(request.installationId, request.owner, request.name, number),
      record,
    );

    if (!this.checkFixtures.has(checksKey(request.installationId, request.owner, request.name, number))) {
      this.checkFixtures.set(
        checksKey(request.installationId, request.owner, request.name, number),
        [
          {
            externalId: `check_quality_${String(number)}`,
            name: "quality",
            status: "completed",
            conclusion: "success",
            detailsUrl: `https://github.com/${request.owner}/${request.name}/runs/${String(number)}`,
            required: true,
          },
        ],
      );
    }

    return Promise.resolve(record);
  }

  readChecks(request: ReadGitHubPullRequestChecksRequest): Promise<GitHubPullRequestCheckRun[]> {
    const key = checksKey(
      request.installationId,
      request.owner,
      request.name,
      request.pullRequestNumber,
    );

    if (!this.pullRequestsByNumber.has(key)) {
      return Promise.reject(
        new GitHubPullRequestError(
          `Pull request ${String(request.pullRequestNumber)} was not found for ${request.owner}/${request.name}`,
        ),
      );
    }

    return Promise.resolve(this.checkFixtures.get(key) ?? []);
  }
}
