import { describe, expect, it } from "vitest";

import {
  assertPolicyMutationSuiteKillsAllMutants,
  evaluatePolicyMutationScenario,
  PLATFORM_POLICY_MUTATION_SCENARIOS,
  runPolicyMutationSuite,
} from "./policy-mutation-testing.js";

describe("policy mutation testing", () => {
  it("kills mutants that weaken implementation plan enforcement", () => {
    const scenario = PLATFORM_POLICY_MUTATION_SCENARIOS.find(
      (entry) => entry.id === "mutant.start_implementation_without_plan",
    );
    if (scenario === undefined) {
      throw new Error("Expected mutation scenario to exist");
    }

    const result = evaluatePolicyMutationScenario(scenario);
    expect(result.baselineDecision).toBe("blocked");
    expect(result.mutatedDecision).toBe("allowed");
    expect(result.killed).toBe(true);
  });

  it("kills all platform policy mutants", () => {
    const results = runPolicyMutationSuite();
    expect(() => {
      assertPolicyMutationSuiteKillsAllMutants(results);
    }).not.toThrow();
    expect(results.every((result) => result.killed)).toBe(true);
  });
});
