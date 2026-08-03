import type { TenantContext } from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "../project/project-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import { enforcePolicyAndTransitionWorkItem } from "./enforce-policy-transition.js";
import type { ApprovalStore } from "./approval-store.js";

export interface ApprovePlanForWorkItemCommand {
  tenantContext: TenantContext;
  lineageId: string;
}

export async function approvePlanForWorkItem(
  command: ApprovePlanForWorkItemCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  approvalStore: ApprovalStore,
  context: IdentityOperationContext,
) {
  return enforcePolicyAndTransitionWorkItem(
    {
      tenantContext: command.tenantContext,
      lineageId: command.lineageId,
      actionType: "approve_implementation_plan",
      transition: "approve_plan",
    },
    projectStore,
    workItemStore,
    approvalStore,
    context,
  );
}
