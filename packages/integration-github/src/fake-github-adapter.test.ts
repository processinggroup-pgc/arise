import { describe, expect, it } from "vitest";

import { FakeGitHubAdapter, type FakeGitHubRepositoryFixture } from "./fake-github-adapter.js";
import { GitHubRepositoryNotFoundError } from "./github-repository-port.js";

const fixture: FakeGitHubRepositoryFixture = {
  installationId: "install_123",
  owner: "PgC-git",
  name: "arise",
  externalId: "987654321",
  fullName: "PgC-git/arise",
  defaultBranch: "main",
  htmlUrl: "https://github.com/PgC-git/arise",
  private: true,
};

describe("FakeGitHubAdapter", () => {
  it("returns repository metadata for a registered fixture", async () => {
    const adapter = new FakeGitHubAdapter([fixture]);

    await expect(
      adapter.getRepository({
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
      }),
    ).resolves.toEqual({
      externalId: "987654321",
      fullName: "PgC-git/arise",
      defaultBranch: "main",
      htmlUrl: "https://github.com/PgC-git/arise",
      private: true,
    });
  });

  it("rejects lookups for unknown repositories", async () => {
    const adapter = new FakeGitHubAdapter([fixture]);

    await expect(
      adapter.getRepository({
        installationId: "install_123",
        owner: "PgC-git",
        name: "missing",
      }),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotFoundError);
  });

  it("requires the installation identifier to match the fixture", async () => {
    const adapter = new FakeGitHubAdapter([fixture]);

    await expect(
      adapter.getRepository({
        installationId: "install_other",
        owner: "PgC-git",
        name: "arise",
      }),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotFoundError);
  });
});
