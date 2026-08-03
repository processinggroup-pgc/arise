import {
  evaluateToolActionRequest,
  type EvaluateToolActionInput,
  type ToolActionDecision,
  type ToolActionEvaluation,
} from "./tool-enforcement.js";

export interface AuthorizationMutationScenario {
  id: string;
  description: string;
  input: EvaluateToolActionInput;
  expectedDecision: ToolActionDecision;
  evaluateMutant: (input: EvaluateToolActionInput) => ToolActionEvaluation;
}

export interface AuthorizationMutationResult {
  scenarioId: string;
  killed: boolean;
  baselineDecision: ToolActionDecision;
  mutatedDecision: ToolActionDecision;
}

export const PLATFORM_AUTHORIZATION_MUTATION_SCENARIOS: AuthorizationMutationScenario[] = [
  {
    id: "mutant.allowlist_bypass",
    description: "Bypassing the tool allowlist should authorize blocked tools",
    input: {
      tool: "repository.write_file",
      allowedTools: ["repository.read_file", "repository.search"],
      budget: { maxActions: 10, maxCostUsd: 5, maxTokens: 10_000 },
      budgetUsage: { actionsUsed: 0, costUsdUsed: 0, tokensUsed: 0 },
    },
    expectedDecision: "blocked",
    evaluateMutant: () => ({
      decision: "allowed",
      reasons: ["Mutant bypassed tool allowlist enforcement"],
      ruleIds: ["mutant.tool.allowlist_bypass"],
    }),
  },
  {
    id: "mutant.action_budget_bypass",
    description: "Bypassing action budget limits should allow exhausted runs to continue",
    input: {
      tool: "repository.read_file",
      allowedTools: ["repository.read_file"],
      budget: { maxActions: 1, maxCostUsd: 5, maxTokens: 10_000 },
      budgetUsage: { actionsUsed: 1, costUsdUsed: 0, tokensUsed: 0 },
    },
    expectedDecision: "budget_exhausted",
    evaluateMutant: () => ({
      decision: "allowed",
      reasons: ["Mutant bypassed action budget enforcement"],
      ruleIds: ["mutant.tool.budget_bypass"],
    }),
  },
];

export function evaluateAuthorizationMutationScenario(
  scenario: AuthorizationMutationScenario,
): AuthorizationMutationResult {
  const baselineDecision = evaluateToolActionRequest(scenario.input).decision;
  const mutatedDecision = scenario.evaluateMutant(scenario.input).decision;

  return {
    scenarioId: scenario.id,
    killed: baselineDecision !== mutatedDecision,
    baselineDecision,
    mutatedDecision,
  };
}

export function runAuthorizationMutationSuite(
  scenarios: AuthorizationMutationScenario[] = PLATFORM_AUTHORIZATION_MUTATION_SCENARIOS,
): AuthorizationMutationResult[] {
  return scenarios.map((scenario) => evaluateAuthorizationMutationScenario(scenario));
}

export function assertAuthorizationMutationSuiteKillsAllMutants(
  results: AuthorizationMutationResult[],
): void {
  const survivors = results.filter((result) => !result.killed);
  if (survivors.length > 0) {
    throw new Error(
      `Authorization mutation survivors detected: ${survivors.map((result) => result.scenarioId).join(", ")}`,
    );
  }
}
