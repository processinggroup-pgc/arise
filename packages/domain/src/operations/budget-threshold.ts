export const PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD = 25;

export const BUDGET_PAUSE_STATUSES = ["active", "released"] as const;
export type BudgetPauseStatus = (typeof BUDGET_PAUSE_STATUSES)[number];

export const BUDGET_THRESHOLD_DECISIONS = ["allowed", "paused"] as const;
export type BudgetThresholdDecision = (typeof BUDGET_THRESHOLD_DECISIONS)[number];

export interface BudgetPause {
  id: string;
  organizationId: string;
  workItemId: string;
  executionSessionId?: string;
  thresholdUsd: number;
  attributedCostUsd: number;
  requestedCostUsd: number;
  status: BudgetPauseStatus;
  reasons: string[];
  createdAt: Date;
  releasedAt?: Date;
}

export interface CreateBudgetPauseInput {
  organizationId: string;
  workItemId: string;
  executionSessionId?: string;
  thresholdUsd: number;
  attributedCostUsd: number;
  requestedCostUsd: number;
  reasons: string[];
}

export interface CreateBudgetPauseMetadata {
  id: string;
  createdAt: Date;
}

export interface EvaluateWorkItemBudgetThresholdInput {
  thresholdUsd: number;
  attributedCostUsd: number;
  requestedCostUsd: number;
  budgetApprovalGranted: boolean;
}

export interface WorkItemBudgetThresholdEvaluation {
  decision: BudgetThresholdDecision;
  thresholdUsd: number;
  attributedCostUsd: number;
  requestedCostUsd: number;
  projectedCostUsd: number;
  reasons: string[];
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

function assertBudgetPauseStatus(status: string): BudgetPauseStatus {
  if (!(BUDGET_PAUSE_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Budget pause status is invalid");
  }

  return status as BudgetPauseStatus;
}

export function evaluateWorkItemBudgetThreshold(
  input: EvaluateWorkItemBudgetThresholdInput,
): WorkItemBudgetThresholdEvaluation {
  const thresholdUsd = assertNonNegativeCost(input.thresholdUsd, "Budget threshold");
  const attributedCostUsd = assertNonNegativeCost(input.attributedCostUsd, "Attributed cost");
  const requestedCostUsd = assertNonNegativeCost(input.requestedCostUsd, "Requested cost");
  const projectedCostUsd = roundCostUsd(attributedCostUsd + requestedCostUsd);

  if (input.budgetApprovalGranted || projectedCostUsd <= thresholdUsd) {
    return {
      decision: "allowed",
      thresholdUsd,
      attributedCostUsd,
      requestedCostUsd,
      projectedCostUsd,
      reasons: ["Work item cost remains within the configured budget threshold"],
    };
  }

  return {
    decision: "paused",
    thresholdUsd,
    attributedCostUsd,
    requestedCostUsd,
    projectedCostUsd,
    reasons: [
      `Work item cost would exceed budget threshold of $${String(thresholdUsd)} (projected $${String(projectedCostUsd)})`,
    ],
  };
}

export function createBudgetPause(
  input: CreateBudgetPauseInput,
  metadata: CreateBudgetPauseMetadata,
): BudgetPause {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Budget pause identifiers are required");
  }

  const reasons = input.reasons.map((reason) => reason.trim()).filter((reason) => reason.length > 0);
  if (reasons.length === 0) {
    throw new Error("Budget pause reasons are required");
  }

  const executionSessionId = input.executionSessionId?.trim();

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    ...(executionSessionId !== undefined && executionSessionId.length > 0
      ? { executionSessionId }
      : {}),
    thresholdUsd: assertNonNegativeCost(input.thresholdUsd, "Budget threshold"),
    attributedCostUsd: assertNonNegativeCost(input.attributedCostUsd, "Attributed cost"),
    requestedCostUsd: assertNonNegativeCost(input.requestedCostUsd, "Requested cost"),
    status: assertBudgetPauseStatus("active"),
    reasons,
    createdAt: metadata.createdAt,
  };
}

export function releaseBudgetPause(pause: BudgetPause, releasedAt: Date): BudgetPause {
  if (pause.status !== "active") {
    throw new Error("Only active budget pauses can be released");
  }

  return {
    ...pause,
    status: "released",
    releasedAt,
  };
}
