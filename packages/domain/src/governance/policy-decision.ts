export const POLICY_DECISIONS = ["allowed", "approval_required", "blocked"] as const;
export type PolicyDecisionType = (typeof POLICY_DECISIONS)[number];

export interface PolicyDecision {
  decision: PolicyDecisionType;
  reasons: string[];
  ruleIds: string[];
  requiredApprovalTypes: string[];
  evidence: Record<string, unknown>;
}

export interface CreatePolicyDecisionInput {
  decision: string;
  reasons: string[];
  ruleIds: string[];
  requiredApprovalTypes?: string[];
  evidence?: Record<string, unknown>;
}

function assertPolicyDecisionType(decision: string): PolicyDecisionType {
  if (!(POLICY_DECISIONS as readonly string[]).includes(decision)) {
    throw new Error("Policy decision is invalid");
  }

  return decision as PolicyDecisionType;
}

export function createPolicyDecision(input: CreatePolicyDecisionInput): PolicyDecision {
  const reasons = input.reasons
    .map((reason) => reason.trim())
    .filter((reason) => reason.length > 0);
  const ruleIds = input.ruleIds
    .map((ruleId) => ruleId.trim())
    .filter((ruleId) => ruleId.length > 0);

  if (reasons.length === 0) {
    throw new Error("Policy decision reasons are required");
  }

  if (ruleIds.length === 0) {
    throw new Error("Policy rule identifiers are required");
  }

  const decision = assertPolicyDecisionType(input.decision);

  if (decision === "approval_required" && (input.requiredApprovalTypes?.length ?? 0) === 0) {
    throw new Error("Required approval types are required when approval is required");
  }

  return {
    decision,
    reasons,
    ruleIds,
    requiredApprovalTypes: input.requiredApprovalTypes ?? [],
    evidence: input.evidence ?? {},
  };
}
