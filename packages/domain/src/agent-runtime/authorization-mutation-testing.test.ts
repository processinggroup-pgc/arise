import { describe, expect, it } from "vitest";

import {
  assertAuthorizationMutationSuiteKillsAllMutants,
  evaluateAuthorizationMutationScenario,
  PLATFORM_AUTHORIZATION_MUTATION_SCENARIOS,
  runAuthorizationMutationSuite,
} from "./authorization-mutation-testing.js";

describe("authorization mutation testing", () => {
  it("kills mutants that bypass tool allowlists", () => {
    const scenario = PLATFORM_AUTHORIZATION_MUTATION_SCENARIOS.find(
      (entry) => entry.id === "mutant.allowlist_bypass",
    );
    if (scenario === undefined) {
      throw new Error("Expected mutation scenario to exist");
    }

    const result = evaluateAuthorizationMutationScenario(scenario);
    expect(result.baselineDecision).toBe("blocked");
    expect(result.mutatedDecision).toBe("allowed");
    expect(result.killed).toBe(true);
  });

  it("kills all platform authorization mutants", () => {
    const results = runAuthorizationMutationSuite();
    expect(() => {
      assertAuthorizationMutationSuiteKillsAllMutants(results);
    }).not.toThrow();
    expect(results.every((result) => result.killed)).toBe(true);
  });
});
