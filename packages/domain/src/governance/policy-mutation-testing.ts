import { createPolicyDecision, type PolicyDecision } from "./policy-decision.js";
import {
  evaluatePolicyAction,
  PLATFORM_POLICY_RULES,
  type PolicyActionContext,
  type PolicyRule,
} from "./policy-evaluation.js";

export interface PolicyMutationScenario {
  id: string;
  description: string;
  context: PolicyActionContext;
  expectedDecision: PolicyDecision["decision"];
  mutateRules: (rules: PolicyRule[]) => PolicyRule[];
}

export interface PolicyMutationResult {
  scenarioId: string;
  killed: boolean;
  baselineDecision: PolicyDecision["decision"];
  mutatedDecision: PolicyDecision["decision"];
}

export const PLATFORM_POLICY_MUTATION_SCENARIOS: PolicyMutationScenario[] = [
  {
    id: "mutant.start_implementation_without_plan",
    description: "Weakening plan approval should allow blocked implementation starts",
    context: {
      actionType: "start_implementation",
      riskClass: "yellow",
      planApproved: false,
    },
    expectedDecision: "blocked",
    mutateRules: (rules) =>
      rules.map((rule) =>
        rule.id === "platform.start_implementation.without_plan"
          ? {
              ...rule,
              decision: createPolicyDecision({
                decision: "allowed",
                reasons: ["Mutant allowed implementation without plan approval"],
                ruleIds: [rule.id],
              }),
            }
          : rule,
      ),
  },
  {
    id: "mutant.destructive_production_migration",
    description: "Weakening production migration guard should allow destructive changes",
    context: {
      actionType: "destructive_migration",
      riskClass: "red",
      productionTarget: true,
    },
    expectedDecision: "blocked",
    mutateRules: (rules) =>
      rules.map((rule) =>
        rule.id === "platform.destructive_migration.production"
          ? {
              ...rule,
              decision: createPolicyDecision({
                decision: "allowed",
                reasons: ["Mutant allowed destructive production migration"],
                ruleIds: [rule.id],
              }),
            }
          : rule,
      ),
  },
  {
    id: "mutant.modify_rls_without_approval",
    description: "Weakening RLS policy should bypass security approval",
    context: {
      actionType: "modify_rls",
      riskClass: "yellow",
    },
    expectedDecision: "approval_required",
    mutateRules: (rules) =>
      rules.map((rule) =>
        rule.id === "platform.modify_rls"
          ? {
              ...rule,
              decision: createPolicyDecision({
                decision: "allowed",
                reasons: ["Mutant allowed RLS changes without approval"],
                ruleIds: [rule.id],
              }),
            }
          : rule,
      ),
  },
];

export function evaluatePolicyMutationScenario(
  scenario: PolicyMutationScenario,
  baselineRules: PolicyRule[] = PLATFORM_POLICY_RULES,
): PolicyMutationResult {
  const baselineDecision = evaluatePolicyAction(scenario.context, baselineRules).decision;
  const mutatedDecision = evaluatePolicyAction(
    scenario.context,
    scenario.mutateRules(baselineRules),
  ).decision;

  return {
    scenarioId: scenario.id,
    killed: baselineDecision !== mutatedDecision,
    baselineDecision,
    mutatedDecision,
  };
}

export function runPolicyMutationSuite(
  scenarios: PolicyMutationScenario[] = PLATFORM_POLICY_MUTATION_SCENARIOS,
): PolicyMutationResult[] {
  return scenarios.map((scenario) => evaluatePolicyMutationScenario(scenario));
}

export function assertPolicyMutationSuiteKillsAllMutants(results: PolicyMutationResult[]): void {
  const survivors = results.filter((result) => !result.killed);
  if (survivors.length > 0) {
    throw new Error(
      `Policy mutation survivors detected: ${survivors.map((result) => result.scenarioId).join(", ")}`,
    );
  }
}
