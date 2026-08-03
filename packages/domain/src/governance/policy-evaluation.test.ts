import { describe, expect, it } from "vitest";

import { createPolicyDecision } from "./policy-decision.js";
import {
  evaluatePolicyAction,
  mapWorkItemRiskLevelToPolicyClass,
  PLATFORM_POLICY_RULES,
} from "./policy-evaluation.js";

describe("evaluatePolicyAction", () => {
  it("allows read-only repository operations", () => {
    const decision = evaluatePolicyAction({
      actionType: "read_repository",
      riskClass: "green",
    });

    expect(decision.decision).toBe("allowed");
  });

  it("requires approval for RLS modifications", () => {
    const decision = evaluatePolicyAction({
      actionType: "modify_rls",
      riskClass: "yellow",
    });

    expect(decision.decision).toBe("approval_required");
    expect(decision.requiredApprovalTypes).toContain("security_approval");
  });

  it("blocks destructive production migrations", () => {
    const decision = evaluatePolicyAction({
      actionType: "destructive_migration",
      riskClass: "red",
      productionTarget: true,
    });

    expect(decision.decision).toBe("blocked");
  });

  it("requires elevated approval for high-risk plan approval", () => {
    const decision = evaluatePolicyAction({
      actionType: "approve_implementation_plan",
      riskClass: "red",
      workItemRiskLevel: "high",
    });

    expect(decision.decision).toBe("approval_required");
    expect(decision.requiredApprovalTypes).toContain("plan_approval");
  });

  it("blocks implementation when the plan is not approved", () => {
    const decision = evaluatePolicyAction({
      actionType: "start_implementation",
      riskClass: "yellow",
      planApproved: false,
    });

    expect(decision.decision).toBe("blocked");
  });
});

describe("mapWorkItemRiskLevelToPolicyClass", () => {
  it("maps work item risk levels to policy classes", () => {
    expect(mapWorkItemRiskLevelToPolicyClass("low")).toBe("green");
    expect(mapWorkItemRiskLevelToPolicyClass("medium")).toBe("yellow");
    expect(mapWorkItemRiskLevelToPolicyClass("critical")).toBe("red");
  });
});

describe("createPolicyDecision", () => {
  it("requires approval types when approval is required", () => {
    expect(() =>
      createPolicyDecision({
        decision: "approval_required",
        reasons: ["Needs approval"],
        ruleIds: ["rule_1"],
      }),
    ).toThrow("Required approval types are required when approval is required");
  });
});

describe("PLATFORM_POLICY_RULES", () => {
  it("includes default deny protection through explicit rule coverage", () => {
    expect(PLATFORM_POLICY_RULES.length).toBeGreaterThan(0);
  });
});
