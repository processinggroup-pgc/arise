import {
  GitHubRepositoryNotFoundError,
  type GitHubRepositoryLookup,
} from "./github-repository-port.js";
import {
  type GitHubRepositoryContentPort,
  type GitHubRepositoryFile,
} from "./github-repository-content-port.js";

export interface FakeGitHubRepositoryContentFixture {
  installationId: string;
  owner: string;
  name: string;
  files: GitHubRepositoryFile[];
}

function fixtureKey(
  fixture: Pick<FakeGitHubRepositoryContentFixture, "installationId" | "owner" | "name">,
): string {
  return `${fixture.installationId}:${fixture.owner.trim().toLowerCase()}/${fixture.name.trim().toLowerCase()}`;
}

export class FakeGitHubContentAdapter implements GitHubRepositoryContentPort {
  private readonly fixtures: Map<string, FakeGitHubRepositoryContentFixture>;

  constructor(fixtures: FakeGitHubRepositoryContentFixture[]) {
    this.fixtures = new Map(fixtures.map((fixture) => [fixtureKey(fixture), fixture]));
  }

  listRepositoryFiles(lookup: GitHubRepositoryLookup): Promise<GitHubRepositoryFile[]> {
    const fixture = this.fixtures.get(
      fixtureKey({
        installationId: lookup.installationId,
        owner: lookup.owner,
        name: lookup.name,
      }),
    );

    if (fixture === undefined) {
      return Promise.reject(new GitHubRepositoryNotFoundError(lookup));
    }

    return Promise.resolve(fixture.files.map((file) => ({ ...file })));
  }
}
