import { describe, expect, it } from "vitest";

import {
  createBudgetPause,
  evaluateWorkItemBudgetThreshold,
  PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD,
} from "./budget-threshold.js";

describe("work item budget threshold", () => {
  it("uses the platform default threshold from the constitution", () => {
    expect(PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD).toBe(25);
  });

  it("allows actions while projected cost stays within the threshold", () => {
    const evaluation = evaluateWorkItemBudgetThreshold({
      thresholdUsd: 25,
      attributedCostUsd: 20,
      requestedCostUsd: 4,
      budgetApprovalGranted: false,
    });

    expect(evaluation.decision).toBe("allowed");
    expect(evaluation.projectedCostUsd).toBe(24);
  });

  it("pauses execution when the threshold would be exceeded", () => {
    const evaluation = evaluateWorkItemBudgetThreshold({
      thresholdUsd: 25,
      attributedCostUsd: 24.5,
      requestedCostUsd: 1,
      budgetApprovalGranted: false,
    });

    expect(evaluation.decision).toBe("paused");
    expect(evaluation.reasons.some((reason) => reason.includes("budget threshold"))).toBe(true);
  });

  it("allows continued execution after budget approval is granted", () => {
    const evaluation = evaluateWorkItemBudgetThreshold({
      thresholdUsd: 25,
      attributedCostUsd: 30,
      requestedCostUsd: 2,
      budgetApprovalGranted: true,
    });

    expect(evaluation.decision).toBe("allowed");
  });

  it("creates an active budget pause record", () => {
    const pause = createBudgetPause(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        executionSessionId: "session_1",
        thresholdUsd: 25,
        attributedCostUsd: 24.5,
        requestedCostUsd: 1,
        reasons: ["Work item cost would exceed budget threshold"],
      },
      { id: "pause_1", createdAt: new Date("2026-08-03T12:00:00.000Z") },
    );

    expect(pause.status).toBe("active");
    expect(pause.executionSessionId).toBe("session_1");
  });
});
