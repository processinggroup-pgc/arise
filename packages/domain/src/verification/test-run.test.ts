import { describe, expect, it } from "vitest";

import {
  buildTestRunArtifactRef,
  completeTestRun,
  createTestRun,
  failTestRun,
  startTestRun,
} from "./test-run.js";

describe("test run lifecycle", () => {
  it("creates and completes a passing test run with counts and artifact evidence", () => {
    const pending = createTestRun(
      {
        organizationId: "org_123",
        executionSessionId: "session_1",
        workItemId: "work_item_1",
        category: "unit",
        command: "pnpm test:unit",
      },
      {
        id: "test_run_1",
        startedAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    const running = startTestRun(pending);
    const completed = completeTestRun(
      running,
      { passed: 10, failed: 0, skipped: 0, total: 10 },
      1200,
      buildTestRunArtifactRef("session_1", "unit", "test_run_1"),
      new Date("2026-08-03T12:00:01.200Z"),
    );

    expect(completed.status).toBe("passed");
    expect(completed.counts.total).toBe(10);
  });

  it("records failed test runs with non-zero failure counts", () => {
    const pending = createTestRun(
      {
        organizationId: "org_123",
        executionSessionId: "session_1",
        workItemId: "work_item_1",
        category: "security",
        command: "pnpm test:integration",
      },
      {
        id: "test_run_2",
        startedAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    const failed = failTestRun(
      startTestRun(pending),
      { passed: 8, failed: 1, skipped: 0, total: 9 },
      900,
      buildTestRunArtifactRef("session_1", "security", "test_run_2"),
      new Date("2026-08-03T12:00:00.900Z"),
    );

    expect(failed.status).toBe("failed");
    expect(failed.counts.failed).toBe(1);
  });
});
