import { describe, expect, it } from "vitest";

import { buildVerificationOrchestrationPlan, evaluateVerificationOrchestrationResult } from "./verification-orchestration.js";
import { createTestRun, startTestRun, completeTestRun, buildTestRunArtifactRef } from "./test-run.js";

describe("verification orchestration", () => {
  it("builds a plan covering all required test categories", () => {
    const plan = buildVerificationOrchestrationPlan();

    expect(plan.categories).toEqual([
      "unit",
      "component",
      "architecture",
      "integration",
      "contract",
      "migration",
      "security",
      "acceptance",
    ]);
    expect(plan.steps).toHaveLength(8);
    expect(plan.steps[0]?.command).toBe("pnpm test:unit");
  });

  it("evaluates orchestration as passed only when every category run passed", () => {
    const startedAt = new Date("2026-08-03T12:00:00.000Z");
    const endedAt = new Date("2026-08-03T12:00:01.000Z");

    const runs = ["unit", "architecture"].map((category, index) =>
      completeTestRun(
        startTestRun(
          createTestRun(
            {
              organizationId: "org_123",
              executionSessionId: "session_1",
              workItemId: "work_item_1",
              category,
              command: `pnpm test:${category}`,
            },
            { id: `test_run_${String(index + 1)}`, startedAt },
          ),
        ),
        { passed: 5, failed: 0, skipped: 0, total: 5 },
        500,
        buildTestRunArtifactRef("session_1", category as "unit", `test_run_${String(index + 1)}`),
        endedAt,
      ),
    );

    const result = evaluateVerificationOrchestrationResult(runs);
    expect(result.passed).toBe(true);
    expect(result.failedCategories).toEqual([]);
  });
});
