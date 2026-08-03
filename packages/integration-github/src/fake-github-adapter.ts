import {
  GitHubRepositoryNotFoundError,
  type GitHubRepositoryLookup,
  type GitHubRepositoryMetadata,
  type GitHubRepositoryPort,
} from "./github-repository-port.js";

export interface FakeGitHubRepositoryFixture extends GitHubRepositoryMetadata {
  installationId: string;
  owner: string;
  name: string;
}

function fixtureKey(
  fixture: Pick<FakeGitHubRepositoryFixture, "installationId" | "owner" | "name">,
): string {
  return `${fixture.installationId}:${fixture.owner.trim().toLowerCase()}/${fixture.name.trim().toLowerCase()}`;
}

export class FakeGitHubAdapter implements GitHubRepositoryPort {
  private readonly fixtures: Map<string, FakeGitHubRepositoryFixture>;

  constructor(fixtures: FakeGitHubRepositoryFixture[]) {
    this.fixtures = new Map(fixtures.map((fixture) => [fixtureKey(fixture), fixture]));
  }

  getRepository(lookup: GitHubRepositoryLookup): Promise<GitHubRepositoryMetadata> {
    const key = fixtureKey({
      installationId: lookup.installationId,
      owner: lookup.owner,
      name: lookup.name,
    });
    const fixture = this.fixtures.get(key);

    if (fixture === undefined) {
      return Promise.reject(new GitHubRepositoryNotFoundError(lookup));
    }

    return Promise.resolve({
      externalId: fixture.externalId,
      fullName: fixture.fullName,
      defaultBranch: fixture.defaultBranch,
      htmlUrl: fixture.htmlUrl,
      private: fixture.private,
    });
  }
}
