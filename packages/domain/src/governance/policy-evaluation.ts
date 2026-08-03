import { createPolicyDecision, type PolicyDecision } from "./policy-decision.js";

export const POLICY_ACTION_TYPES = [
  "read_repository",
  "modify_rls",
  "destructive_migration",
  "approve_implementation_plan",
  "start_implementation",
  "request_production_promotion",
] as const;

export type PolicyActionType = (typeof POLICY_ACTION_TYPES)[number];

export const POLICY_RISK_CLASSES = ["green", "yellow", "red"] as const;
export type PolicyRiskClass = (typeof POLICY_RISK_CLASSES)[number];

export interface PolicyActionContext {
  actionType: PolicyActionType;
  riskClass?: PolicyRiskClass;
  workItemRiskLevel?: string;
  productionTarget?: boolean;
  planApproved?: boolean;
}

export interface PolicyRule {
  id: string;
  actionType: PolicyActionType;
  workItemRiskLevels?: string[];
  productionTarget?: boolean;
  planApproved?: boolean;
  decision: PolicyDecision;
}

export const PLATFORM_POLICY_RULES: PolicyRule[] = [
  {
    id: "platform.read_repository",
    actionType: "read_repository",
    decision: createPolicyDecision({
      decision: "allowed",
      reasons: ["Read-only repository operations are permitted"],
      ruleIds: ["platform.read_repository"],
    }),
  },
  {
    id: "platform.modify_rls",
    actionType: "modify_rls",
    decision: createPolicyDecision({
      decision: "approval_required",
      reasons: ["RLS policy modifications require security approval"],
      ruleIds: ["platform.modify_rls"],
      requiredApprovalTypes: ["security_approval"],
    }),
  },
  {
    id: "platform.destructive_migration.production",
    actionType: "destructive_migration",
    productionTarget: true,
    decision: createPolicyDecision({
      decision: "blocked",
      reasons: ["Destructive production migrations are blocked without elevated approval"],
      ruleIds: ["platform.destructive_migration.production"],
    }),
  },
  {
    id: "platform.destructive_migration.non_production",
    actionType: "destructive_migration",
    productionTarget: false,
    decision: createPolicyDecision({
      decision: "approval_required",
      reasons: ["Destructive migrations require elevated approval"],
      ruleIds: ["platform.destructive_migration.non_production"],
      requiredApprovalTypes: ["security_approval"],
    }),
  },
  {
    id: "platform.start_implementation.without_plan",
    actionType: "start_implementation",
    planApproved: false,
    decision: createPolicyDecision({
      decision: "blocked",
      reasons: ["Implementation cannot start before plan approval"],
      ruleIds: ["platform.start_implementation.without_plan"],
    }),
  },
  {
    id: "platform.approve_plan.high_risk",
    actionType: "approve_implementation_plan",
    workItemRiskLevels: ["high", "critical"],
    decision: createPolicyDecision({
      decision: "approval_required",
      reasons: ["High-risk work items require explicit plan approval"],
      ruleIds: ["platform.approve_plan.high_risk"],
      requiredApprovalTypes: ["plan_approval"],
    }),
  },
  {
    id: "platform.approve_plan.default",
    actionType: "approve_implementation_plan",
    decision: createPolicyDecision({
      decision: "allowed",
      reasons: ["Plan approval is permitted for standard-risk work items"],
      ruleIds: ["platform.approve_plan.default"],
    }),
  },
  {
    id: "platform.production_promotion.default",
    actionType: "request_production_promotion",
    productionTarget: true,
    decision: createPolicyDecision({
      decision: "approval_required",
      reasons: ["Production promotion requires human approval"],
      ruleIds: ["platform.production_promotion.default"],
      requiredApprovalTypes: ["release_approval", "production_promotion"],
    }),
  },
];

function matchesRule(rule: PolicyRule, context: PolicyActionContext): boolean {
  if (rule.actionType !== context.actionType) {
    return false;
  }

  if (rule.productionTarget !== undefined && rule.productionTarget !== context.productionTarget) {
    return false;
  }

  if (rule.planApproved !== undefined && rule.planApproved !== context.planApproved) {
    return false;
  }

  if (rule.workItemRiskLevels !== undefined) {
    if (
      context.workItemRiskLevel === undefined ||
      !rule.workItemRiskLevels.includes(context.workItemRiskLevel)
    ) {
      return false;
    }
  }

  return true;
}

export function evaluatePolicyAction(
  context: PolicyActionContext,
  rules: PolicyRule[] = PLATFORM_POLICY_RULES,
): PolicyDecision {
  const matchingRules = rules.filter((rule) => matchesRule(rule, context));

  if (matchingRules.length === 0) {
    return createPolicyDecision({
      decision: "blocked",
      reasons: ["No policy rule matched the requested action"],
      ruleIds: ["platform.default_deny"],
    });
  }

  const blockedRule = matchingRules.find((rule) => rule.decision.decision === "blocked");
  if (blockedRule !== undefined) {
    return blockedRule.decision;
  }

  const approvalRule = matchingRules.find((rule) => rule.decision.decision === "approval_required");
  if (approvalRule !== undefined) {
    return approvalRule.decision;
  }

  const allowedRule = matchingRules.find((rule) => rule.decision.decision === "allowed");
  if (allowedRule !== undefined) {
    return allowedRule.decision;
  }

  return createPolicyDecision({
    decision: "blocked",
    reasons: ["Policy evaluation did not resolve a decision"],
    ruleIds: ["platform.default_deny"],
  });
}

export function mapWorkItemRiskLevelToPolicyClass(riskLevel: string): PolicyRiskClass {
  if (riskLevel === "low") {
    return "green";
  }

  if (riskLevel === "medium") {
    return "yellow";
  }

  return "red";
}
