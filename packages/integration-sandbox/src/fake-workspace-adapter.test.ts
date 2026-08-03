import { describe, expect, it } from "vitest";

import { FakeWorkspaceAdapter } from "./fake-workspace-adapter.js";

describe("FakeWorkspaceAdapter", () => {
  it("supports typed repository read, search, write, and diff tools", async () => {
    const workspace = new FakeWorkspaceAdapter();
    workspace.seedWorkspace(
      "fake_sandbox_session_1",
      {
        "src/index.ts": "export function hello() {}",
        "src/utils.ts": "export const helper = true;",
      },
      "feature/onboarding",
    );

    const read = await workspace.readFile({
      sandboxSessionId: "fake_sandbox_session_1",
      path: "src/index.ts",
    });
    expect(read.content).toContain("hello");

    const search = await workspace.search({
      sandboxSessionId: "fake_sandbox_session_1",
      query: "helper",
    });
    expect(search.matches).toHaveLength(1);

    await workspace.writeFile({
      sandboxSessionId: "fake_sandbox_session_1",
      path: "src/index.ts",
      content: "export function hello() { return 'hi'; }",
    });

    const diff = await workspace.diff({
      sandboxSessionId: "fake_sandbox_session_1",
      path: "src/index.ts",
    });
    expect(diff.before).not.toBe(diff.after);
  });

  it("supports typed git branch and commit tools", async () => {
    const workspace = new FakeWorkspaceAdapter();
    workspace.seedWorkspace("fake_sandbox_session_2", { "README.md": "# ARISE" }, "main");

    const branch = await workspace.createBranch({
      sandboxSessionId: "fake_sandbox_session_2",
      branchName: "feature/task-1",
    });
    expect(branch.branchName).toBe("feature/task-1");

    const commit = await workspace.commit({
      sandboxSessionId: "fake_sandbox_session_2",
      message: "Add README update",
    });
    expect(commit.commitId).toMatch(/^fake_commit_/);
  });
});
