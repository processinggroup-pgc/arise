import {
  type PolicyDecision,
  type TenantContext,
  type WorkItem,
  type WorkItemTransition,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { WorkItemScopeError } from "../intent/create-work-item.js";
import type { ProjectStore } from "../project/project-store.js";
import { applyWorkItemTransition } from "../intent/transition-work-item-state.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import {
  assertRequiredApprovals,
  evaluateActionPolicy,
  PolicyBlockedError,
} from "./manage-approvals.js";
import type { ApprovalStore } from "./approval-store.js";

export interface EnforcePolicyTransitionCommand {
  tenantContext: TenantContext;
  lineageId: string;
  actionType: Parameters<typeof evaluateActionPolicy>[0]["actionType"];
  transition: WorkItemTransition;
  productionTarget?: boolean;
}

export interface EnforcePolicyTransitionResult {
  policyDecision: PolicyDecision;
  workItem: WorkItem;
}

export async function enforcePolicyAndTransitionWorkItem(
  command: EnforcePolicyTransitionCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  approvalStore: ApprovalStore,
  context: IdentityOperationContext,
): Promise<EnforcePolicyTransitionResult> {
  const latest = await workItemStore.findLatestByLineageId(command.lineageId);
  if (latest === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (latest.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }

  const policyDecision = evaluateActionPolicy({
    actionType: command.actionType,
    workItemRiskLevel: latest.riskLevel,
    ...(command.productionTarget !== undefined
      ? { productionTarget: command.productionTarget }
      : {}),
    planApproved: latest.state === "plan_approved" || latest.state === "implementing",
  });

  try {
    await assertRequiredApprovals(
      policyDecision,
      command.tenantContext.organizationId,
      "work_item",
      latest.lineageId,
      approvalStore,
      context.now(),
    );
  } catch (error) {
    if (error instanceof PolicyBlockedError) {
      throw error;
    }

    throw error;
  }

  const workItem = await applyWorkItemTransition(
    {
      tenantContext: command.tenantContext,
      lineageId: command.lineageId,
      transition: command.transition,
    },
    projectStore,
    workItemStore,
    context,
  );

  return {
    policyDecision,
    workItem,
  };
}
