import {
  assignTechnicalDebtSupportOwner,
  createTechnicalDebtItem,
  type TechnicalDebtItem,
  type TenantContext,
} from "@arise/domain";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { ProjectStore } from "../project/project-store.js";
import type { TechnicalDebtStore } from "./technical-debt-store.js";

export interface RecordTechnicalDebtForWorkItemCommand {
  tenantContext: TenantContext;
  workItemId: string;
  description: string;
  risk: string;
  ownerId: string;
  dueDate: Date;
  supportOwnerId?: string;
}

export interface RecordTechnicalDebtForWorkItemResult {
  item: TechnicalDebtItem;
}

export async function recordTechnicalDebtForWorkItem(
  command: RecordTechnicalDebtForWorkItemCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  technicalDebtStore: TechnicalDebtStore,
  operationContext: IdentityOperationContext,
): Promise<RecordTechnicalDebtForWorkItemResult> {
  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  const project = await projectStore.findProjectById(workItem.projectId);
  if (project === undefined) {
    throw new AgentRunScopeError("Project was not found");
  }

  if (project.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Project is outside the tenant scope");
  }

  const item = createTechnicalDebtItem(
    {
      organizationId: command.tenantContext.organizationId,
      projectId: project.id,
      sourceWorkItemId: workItem.id,
      description: command.description,
      risk: command.risk,
      ownerId: command.ownerId,
      dueDate: command.dueDate,
      ...(command.supportOwnerId !== undefined ? { supportOwnerId: command.supportOwnerId } : {}),
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await technicalDebtStore.saveTechnicalDebtItem(item);

  return { item };
}

export interface AssignTechnicalDebtSupportOwnerCommand {
  tenantContext: TenantContext;
  technicalDebtId: string;
  supportOwnerId: string;
}

export interface AssignTechnicalDebtSupportOwnerResult {
  item: TechnicalDebtItem;
}

export async function assignTechnicalDebtSupportOwnerForItem(
  command: AssignTechnicalDebtSupportOwnerCommand,
  technicalDebtStore: TechnicalDebtStore,
  operationContext: IdentityOperationContext,
): Promise<AssignTechnicalDebtSupportOwnerResult> {
  const item = await technicalDebtStore.findTechnicalDebtItemById(command.technicalDebtId);
  if (item === undefined) {
    throw new AgentRunScopeError("Technical debt item was not found");
  }

  if (item.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Technical debt item is outside the tenant scope");
  }

  const updated = assignTechnicalDebtSupportOwner(item, {
    supportOwnerId: command.supportOwnerId,
    updatedAt: operationContext.now(),
  });

  await technicalDebtStore.saveTechnicalDebtItem(updated);

  return { item: updated };
}
