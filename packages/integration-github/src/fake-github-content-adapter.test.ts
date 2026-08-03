import { describe, expect, it } from "vitest";

import { FakeGitHubContentAdapter } from "./fake-github-content-adapter.js";
import { GitHubRepositoryNotFoundError } from "./github-repository-port.js";

describe("FakeGitHubContentAdapter", () => {
  it("returns repository files for a registered fixture", async () => {
    const adapter = new FakeGitHubContentAdapter([
      {
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
        files: [
          {
            path: "src/memberships/route.ts",
            content: "export function listMemberships() {}",
          },
        ],
      },
    ]);

    await expect(
      adapter.listRepositoryFiles({
        installationId: "install_123",
        owner: "PgC-git",
        name: "arise",
      }),
    ).resolves.toEqual([
      {
        path: "src/memberships/route.ts",
        content: "export function listMemberships() {}",
      },
    ]);
  });

  it("rejects unknown repositories", async () => {
    const adapter = new FakeGitHubContentAdapter([]);

    await expect(
      adapter.listRepositoryFiles({
        installationId: "install_123",
        owner: "PgC-git",
        name: "missing",
      }),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotFoundError);
  });
});
