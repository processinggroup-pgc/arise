import { describe, expect, it } from "vitest";

import {
  buildWorkItemOutcomeCostSummary,
  createWorkItemOutcome,
  evaluateWorkItemOutcomeReadiness,
  proposeGovernedImprovements,
} from "./outcome-evaluation.js";

const closedAt = new Date("2026-08-03T12:00:00.000Z");

describe("work item outcome evaluation", () => {
  it("builds a cost summary from attributed totals", () => {
    const summary = buildWorkItemOutcomeCostSummary({
      totalCostUsd: 12.5,
      modelCostUsd: 10,
      buildCostUsd: 1.5,
      sandboxCostUsd: 1,
    });

    expect(summary.totalCostUsd).toBe(12.5);
  });

  it("requires cost, incident and debt records before outcome is complete", () => {
    const evaluation = evaluateWorkItemOutcomeReadiness({
      hasCostAttribution: false,
      incidentCount: 0,
      openTechnicalDebtCount: 1,
      releaseEvidenceComplete: true,
      evaluationWindowClosed: true,
    });

    expect(evaluation.complete).toBe(false);
    expect(evaluation.blockers.some((blocker) => blocker.includes("Cost attribution"))).toBe(true);
  });

  it("proposes governed improvements when incidents or high-risk debt remain", () => {
    const recommendations = proposeGovernedImprovements({
      incidentCount: 1,
      openHighRiskDebtCount: 1,
      totalCostUsd: 30,
      budgetThresholdUsd: 25,
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]?.approvalType).toBe("plan_approval");
  });

  it("creates a complete outcome record when readiness passes", () => {
    const outcome = createWorkItemOutcome(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        workItemVersion: 2,
        evaluationWindowClosedAt: closedAt,
        releaseSuccessful: true,
        hasCostAttribution: true,
        releaseEvidenceComplete: true,
        cost: buildWorkItemOutcomeCostSummary({
          totalCostUsd: 12.5,
          modelCostUsd: 10,
          buildCostUsd: 1.5,
          sandboxCostUsd: 1,
        }),
        incidentCount: 0,
        openTechnicalDebtCount: 1,
        lessons: ["Preview validation caught migration risk early"],
        recommendations: proposeGovernedImprovements({
          incidentCount: 0,
          openHighRiskDebtCount: 0,
          totalCostUsd: 12.5,
          budgetThresholdUsd: 25,
        }),
      },
      { id: "outcome_1", evaluatedAt: closedAt },
    );

    expect(outcome.complete).toBe(true);
    expect(outcome.lessons).toHaveLength(1);
  });
});
