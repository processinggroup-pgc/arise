import { PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD } from "./budget-threshold.js";

export const GOVERNED_IMPROVEMENT_CATEGORIES = ["policy", "pattern"] as const;
export type GovernedImprovementCategory = (typeof GOVERNED_IMPROVEMENT_CATEGORIES)[number];

export const GOVERNED_IMPROVEMENT_APPROVAL_TYPES = ["plan_approval"] as const;
export type GovernedImprovementApprovalType = (typeof GOVERNED_IMPROVEMENT_APPROVAL_TYPES)[number];

export interface WorkItemOutcomeCostSummary {
  totalCostUsd: number;
  modelCostUsd: number;
  buildCostUsd: number;
  sandboxCostUsd: number;
}

export interface GovernedImprovementRecommendation {
  id: string;
  category: GovernedImprovementCategory;
  title: string;
  rationale: string;
  requiresApproval: true;
  approvalType: GovernedImprovementApprovalType;
}

export interface WorkItemOutcome {
  id: string;
  organizationId: string;
  workItemId: string;
  workItemVersion: number;
  evaluationWindowClosedAt: Date;
  releaseSuccessful: boolean;
  cost: WorkItemOutcomeCostSummary;
  incidentCount: number;
  openTechnicalDebtCount: number;
  lessons: string[];
  recommendations: GovernedImprovementRecommendation[];
  complete: boolean;
  blockers: string[];
  evaluatedAt: Date;
}

export interface CreateWorkItemOutcomeInput {
  organizationId: string;
  workItemId: string;
  workItemVersion: number;
  evaluationWindowClosedAt: Date;
  releaseSuccessful: boolean;
  hasCostAttribution: boolean;
  releaseEvidenceComplete: boolean;
  cost: WorkItemOutcomeCostSummary;
  incidentCount: number;
  openTechnicalDebtCount: number;
  lessons: string[];
  recommendations: GovernedImprovementRecommendation[];
}

export interface CreateWorkItemOutcomeMetadata {
  id: string;
  evaluatedAt: Date;
}

export interface EvaluateWorkItemOutcomeReadinessInput {
  hasCostAttribution: boolean;
  incidentCount: number;
  openTechnicalDebtCount: number;
  releaseEvidenceComplete: boolean;
  evaluationWindowClosed: boolean;
}

export interface WorkItemOutcomeReadinessEvaluation {
  complete: boolean;
  blockers: string[];
}

export interface ProposeGovernedImprovementsInput {
  incidentCount: number;
  openHighRiskDebtCount: number;
  totalCostUsd: number;
  budgetThresholdUsd?: number;
}

function roundCostUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNonNegativeCost(costUsd: number, label: string): number {
  if (costUsd < 0) {
    throw new Error(`${label} cannot be negative`);
  }

  return roundCostUsd(costUsd);
}

function assertGovernedImprovementCategory(category: string): GovernedImprovementCategory {
  if (!(GOVERNED_IMPROVEMENT_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Governed improvement category is invalid");
  }

  return category as GovernedImprovementCategory;
}

function assertGovernedImprovementApprovalType(
  approvalType: string,
): GovernedImprovementApprovalType {
  if (!(GOVERNED_IMPROVEMENT_APPROVAL_TYPES as readonly string[]).includes(approvalType)) {
    throw new Error("Governed improvement approval type is invalid");
  }

  return approvalType as GovernedImprovementApprovalType;
}

export function buildWorkItemOutcomeCostSummary(input: {
  totalCostUsd: number;
  modelCostUsd: number;
  buildCostUsd: number;
  sandboxCostUsd: number;
}): WorkItemOutcomeCostSummary {
  return {
    totalCostUsd: assertNonNegativeCost(input.totalCostUsd, "Total cost"),
    modelCostUsd: assertNonNegativeCost(input.modelCostUsd, "Model cost"),
    buildCostUsd: assertNonNegativeCost(input.buildCostUsd, "Build cost"),
    sandboxCostUsd: assertNonNegativeCost(input.sandboxCostUsd, "Sandbox cost"),
  };
}

export function evaluateWorkItemOutcomeReadiness(
  input: EvaluateWorkItemOutcomeReadinessInput,
): WorkItemOutcomeReadinessEvaluation {
  const blockers: string[] = [];

  if (!input.evaluationWindowClosed) {
    blockers.push("Evaluation window is still open");
  }

  if (!input.releaseEvidenceComplete) {
    blockers.push("Release evidence is incomplete");
  }

  if (!input.hasCostAttribution) {
    blockers.push("Cost attribution has not been recorded");
  }

  if (input.incidentCount < 0 || input.openTechnicalDebtCount < 0) {
    blockers.push("Outcome counters cannot be negative");
  }

  return {
    complete: blockers.length === 0,
    blockers,
  };
}

export function proposeGovernedImprovements(
  input: ProposeGovernedImprovementsInput,
): GovernedImprovementRecommendation[] {
  const recommendations: GovernedImprovementRecommendation[] = [];
  const budgetThresholdUsd = input.budgetThresholdUsd ?? PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD;

  if (input.incidentCount > 0) {
    recommendations.push({
      id: "recommendation_incident_policy_review",
      category: assertGovernedImprovementCategory("policy"),
      title: "Review incident response policy",
      rationale: `${String(input.incidentCount)} incident(s) occurred during delivery and require policy review`,
      requiresApproval: true,
      approvalType: assertGovernedImprovementApprovalType("plan_approval"),
    });
  }

  if (input.openHighRiskDebtCount > 0) {
    recommendations.push({
      id: "recommendation_debt_pattern_update",
      category: assertGovernedImprovementCategory("pattern"),
      title: "Strengthen technical-debt remediation pattern",
      rationale: `${String(input.openHighRiskDebtCount)} high-risk debt item(s) remain open after release`,
      requiresApproval: true,
      approvalType: assertGovernedImprovementApprovalType("plan_approval"),
    });
  }

  if (input.totalCostUsd > budgetThresholdUsd) {
    recommendations.push({
      id: "recommendation_budget_policy_adjustment",
      category: assertGovernedImprovementCategory("policy"),
      title: "Adjust work-item budget threshold policy",
      rationale: `Total cost $${String(input.totalCostUsd)} exceeded threshold $${String(budgetThresholdUsd)}`,
      requiresApproval: true,
      approvalType: assertGovernedImprovementApprovalType("plan_approval"),
    });
  }

  return recommendations;
}

export function createWorkItemOutcome(
  input: CreateWorkItemOutcomeInput,
  metadata: CreateWorkItemOutcomeMetadata,
): WorkItemOutcome {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Work item outcome identifiers are required");
  }

  if (input.workItemVersion < 1) {
    throw new Error("Work item outcome version is invalid");
  }

  const lessons = input.lessons.map((lesson) => lesson.trim()).filter((lesson) => lesson.length > 0);
  const readiness = evaluateWorkItemOutcomeReadiness({
    hasCostAttribution: input.hasCostAttribution,
    incidentCount: input.incidentCount,
    openTechnicalDebtCount: input.openTechnicalDebtCount,
    releaseEvidenceComplete: input.releaseEvidenceComplete,
    evaluationWindowClosed: true,
  });

  if (!readiness.complete) {
    throw new Error(readiness.blockers.join("; "));
  }

  if (input.incidentCount < 0 || input.openTechnicalDebtCount < 0) {
    throw new Error("Outcome counters cannot be negative");
  }

  for (const recommendation of input.recommendations) {
    assertGovernedImprovementApprovalType(recommendation.approvalType);
    assertGovernedImprovementCategory(recommendation.category);
  }

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    workItemVersion: input.workItemVersion,
    evaluationWindowClosedAt: input.evaluationWindowClosedAt,
    releaseSuccessful: input.releaseSuccessful,
    cost: input.cost,
    incidentCount: input.incidentCount,
    openTechnicalDebtCount: input.openTechnicalDebtCount,
    lessons,
    recommendations: input.recommendations,
    complete: true,
    blockers: [],
    evaluatedAt: metadata.evaluatedAt,
  };
}
