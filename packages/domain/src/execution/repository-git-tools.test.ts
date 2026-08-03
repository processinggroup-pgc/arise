import { describe, expect, it } from "vitest";

import {
  assertWorkspaceRelativePath,
  parseRepositoryGitToolArguments,
} from "./repository-git-tools.js";

describe("repository and git tool contracts", () => {
  it("parses typed read and write file arguments", () => {
    const readArgs = parseRepositoryGitToolArguments("repository.read_file", {
      path: "src/index.ts",
    });
    expect(readArgs.tool).toBe("repository.read_file");

    const writeArgs = parseRepositoryGitToolArguments("repository.write_file", {
      path: "src/index.ts",
      content: "export {}",
    });
    expect(writeArgs.arguments.content).toBe("export {}");
  });

  it("blocks path traversal in workspace paths", () => {
    expect(() => {
      assertWorkspaceRelativePath("../etc/passwd");
    }).toThrow("Workspace path traversal is blocked");

    expect(() => {
      assertWorkspaceRelativePath("/etc/passwd");
    }).toThrow("Workspace path must be relative");
  });

  it("parses git branch and commit arguments", () => {
    const branchArgs = parseRepositoryGitToolArguments("git.create_branch", {
      branchName: "feature/onboarding",
    });
    expect(branchArgs.arguments.branchName).toBe("feature/onboarding");

    const commitArgs = parseRepositoryGitToolArguments("git.commit", {
      message: "Implement onboarding workflow",
    });
    expect(commitArgs.arguments.message).toBe("Implement onboarding workflow");
  });
});
