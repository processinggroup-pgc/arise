import {
  createBudgetPause,
  evaluateWorkItemBudgetThreshold,
  isApprovalActive,
  PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD,
  type BudgetPause,
  type TenantContext,
  type WorkItemBudgetThresholdEvaluation,
} from "@arise/domain";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { ApprovalStore } from "../governance/approval-store.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { BudgetPauseStore } from "./budget-pause-store.js";
import type { CostAttributionStore } from "./cost-attribution-store.js";

export interface EnforceBudgetThresholdBeforeActionCommand {
  tenantContext: TenantContext;
  workItemId: string;
  requestedCostUsd: number;
  executionSessionId?: string;
  thresholdUsd?: number;
}

export interface EnforceBudgetThresholdBeforeActionResult {
  evaluation: WorkItemBudgetThresholdEvaluation;
  pause?: BudgetPause;
}

export class BudgetThresholdPausedError extends Error {
  constructor(
    message: string,
    readonly evaluation: WorkItemBudgetThresholdEvaluation,
    readonly pause: BudgetPause,
  ) {
    super(message);
    this.name = "BudgetThresholdPausedError";
  }
}

async function resolveAttributedCostUsd(
  workItemId: string,
  costAttributionStore: CostAttributionStore,
): Promise<number> {
  const attributions = await costAttributionStore.listCostAttributionsForWorkItem(workItemId);
  if (attributions.length === 0) {
    return 0;
  }

  const [first, ...rest] = attributions;
  if (first === undefined) {
    return 0;
  }

  const latest = rest.reduce(
    (current, attribution) =>
      attribution.attributedAt.getTime() > current.attributedAt.getTime() ? attribution : current,
    first,
  );

  return latest.totalCostUsd;
}

async function hasActiveBudgetApproval(
  organizationId: string,
  workItemId: string,
  approvalStore: ApprovalStore,
  at: Date,
): Promise<boolean> {
  const approvals = await approvalStore.listApprovalsForSubject(
    organizationId,
    "work_item",
    workItemId,
  );

  return approvals.some(
    (approval) => approval.approvalType === "budget_approval" && isApprovalActive(approval, at),
  );
}

export async function enforceBudgetThresholdBeforeAction(
  command: EnforceBudgetThresholdBeforeActionCommand,
  workItemStore: WorkItemStore,
  costAttributionStore: CostAttributionStore,
  approvalStore: ApprovalStore,
  budgetPauseStore: BudgetPauseStore,
  operationContext: IdentityOperationContext,
): Promise<EnforceBudgetThresholdBeforeActionResult> {
  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  const thresholdUsd = command.thresholdUsd ?? PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD;
  const attributedCostUsd = await resolveAttributedCostUsd(
    command.workItemId,
    costAttributionStore,
  );
  const budgetApprovalGranted = await hasActiveBudgetApproval(
    command.tenantContext.organizationId,
    command.workItemId,
    approvalStore,
    operationContext.now(),
  );

  const evaluation = evaluateWorkItemBudgetThreshold({
    thresholdUsd,
    attributedCostUsd,
    requestedCostUsd: command.requestedCostUsd,
    budgetApprovalGranted,
  });

  if (evaluation.decision === "allowed") {
    return { evaluation };
  }

  const existingPause = await budgetPauseStore.findActiveBudgetPauseForWorkItem(command.workItemId);
  const pause =
    existingPause ??
    (await (async () => {
      const created = createBudgetPause(
        {
          organizationId: command.tenantContext.organizationId,
          workItemId: command.workItemId,
          thresholdUsd,
          attributedCostUsd,
          requestedCostUsd: command.requestedCostUsd,
          reasons: evaluation.reasons,
          ...(command.executionSessionId !== undefined
            ? { executionSessionId: command.executionSessionId }
            : {}),
        },
        {
          id: operationContext.createId(),
          createdAt: operationContext.now(),
        },
      );
      await budgetPauseStore.saveBudgetPause(created);
      return created;
    })());

  throw new BudgetThresholdPausedError(evaluation.reasons.join("; "), evaluation, pause);
}
