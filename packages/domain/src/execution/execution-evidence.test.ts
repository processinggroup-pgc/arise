import { describe, expect, it } from "vitest";

import { createExecutionEvidence } from "./execution-evidence.js";

describe("execution evidence", () => {
  it("creates durable evidence for commits, diffs and tool call references", () => {
    const evidence = createExecutionEvidence(
      {
        organizationId: "org_123",
        executionSessionId: "session_1",
        agentRunId: "run_coding_1",
        workItemId: "work_item_1",
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/index.ts", "src/index.test.ts"],
        diffs: [
          {
            path: "src/index.ts",
            before: "export {}",
            after: "export function hello() {}",
          },
        ],
        toolCallEvidenceRefs: [
          "execution/session_1/tool_1.json",
          "execution/session_1/tool_2.json",
        ],
      },
      {
        id: "evidence_1",
        capturedAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(evidence.commitId).toBe("fake_commit_1");
    expect(evidence.diffs).toHaveLength(1);
    expect(evidence.toolCallEvidenceRefs).toHaveLength(2);
  });

  it("rejects diffs that do not reference changed paths", () => {
    expect(() =>
      createExecutionEvidence(
        {
          organizationId: "org_123",
          executionSessionId: "session_1",
          agentRunId: "run_coding_1",
          workItemId: "work_item_1",
          branchName: "feature/onboarding",
          commitId: "fake_commit_1",
          changedPaths: ["src/index.ts"],
          diffs: [
            {
              path: "src/other.ts",
              before: "",
              after: "changed",
            },
          ],
          toolCallEvidenceRefs: [],
        },
        {
          id: "evidence_2",
          capturedAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Execution diff path must reference a changed path");
  });
});
