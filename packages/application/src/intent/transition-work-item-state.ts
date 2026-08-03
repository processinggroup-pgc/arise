import {
  createWorkItemRevision,
  transitionWorkItemState,
  type TenantContext,
  type WorkItem,
  type WorkItemTransition,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "../project/project-store.js";
import { WorkItemScopeError } from "./create-work-item.js";
import type { WorkItemStore } from "./work-item-store.js";

export interface ApplyWorkItemTransitionCommand {
  tenantContext: TenantContext;
  lineageId: string;
  transition: WorkItemTransition;
}

export async function applyWorkItemTransition(
  command: ApplyWorkItemTransitionCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  context: IdentityOperationContext,
): Promise<WorkItem> {
  const latest = await workItemStore.findLatestByLineageId(command.lineageId);
  if (latest === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (latest.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }

  const project = await projectStore.findProjectById(latest.projectId);
  if (project === undefined || project.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Project is outside the tenant scope");
  }

  const nextState = transitionWorkItemState(latest.state, command.transition);
  if (nextState === latest.state) {
    return latest;
  }

  const revised = createWorkItemRevision(
    latest,
    { state: nextState },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await workItemStore.saveWorkItemVersion(revised);
  return revised;
}
