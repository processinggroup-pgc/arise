import {
  createWorkItem,
  createWorkItemRevision,
  type AcceptanceCriterion,
  type TenantContext,
  type UnresolvedQuestion,
  type WorkItem,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "../project/project-store.js";
import type { WorkItemStore } from "./work-item-store.js";

export interface CreateWorkItemCommand {
  tenantContext: TenantContext;
  projectId: string;
  title: string;
  type: string;
  riskLevel: string;
  ownerId: string;
  problemStatement: string;
  targetUser: string;
  currentBehavior?: string;
  desiredBehavior: string;
  measurableOutcome?: string;
  dataClassification: string;
  constraints?: string[];
  nonGoals?: string[];
  affectedSystems?: string[];
  dependencies?: string[];
  decisionAuthority?: string;
  unresolvedQuestions?: UnresolvedQuestion[];
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface ReviseWorkItemCommand {
  tenantContext: TenantContext;
  lineageId: string;
  title?: string;
  type?: string;
  riskLevel?: string;
  ownerId?: string;
  problemStatement?: string;
  targetUser?: string;
  currentBehavior?: string;
  desiredBehavior?: string;
  measurableOutcome?: string;
  dataClassification?: string;
  constraints?: string[];
  nonGoals?: string[];
  affectedSystems?: string[];
  dependencies?: string[];
  decisionAuthority?: string;
  unresolvedQuestions?: UnresolvedQuestion[];
  acceptanceCriteria?: AcceptanceCriterion[];
}

export class WorkItemScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkItemScopeError";
  }
}

async function assertProjectInTenantScope(
  projectStore: ProjectStore,
  projectId: string,
  tenantContext: TenantContext,
): Promise<void> {
  const project = await projectStore.findProjectById(projectId);
  if (project === undefined) {
    throw new WorkItemScopeError("Project was not found");
  }

  if (project.organizationId !== tenantContext.organizationId) {
    throw new WorkItemScopeError("Project is outside the tenant scope");
  }
}

export async function createWorkItemForProject(
  command: CreateWorkItemCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  context: IdentityOperationContext,
): Promise<WorkItem> {
  await assertProjectInTenantScope(projectStore, command.projectId, command.tenantContext);

  const lineageId = context.createId();
  const workItem = createWorkItem(
    {
      projectId: command.projectId,
      organizationId: command.tenantContext.organizationId,
      title: command.title,
      type: command.type,
      riskLevel: command.riskLevel,
      ownerId: command.ownerId,
      problemStatement: command.problemStatement,
      targetUser: command.targetUser,
      desiredBehavior: command.desiredBehavior,
      dataClassification: command.dataClassification,
      acceptanceCriteria: command.acceptanceCriteria,
      ...(command.currentBehavior !== undefined
        ? { currentBehavior: command.currentBehavior }
        : {}),
      ...(command.measurableOutcome !== undefined
        ? { measurableOutcome: command.measurableOutcome }
        : {}),
      ...(command.constraints !== undefined ? { constraints: command.constraints } : {}),
      ...(command.nonGoals !== undefined ? { nonGoals: command.nonGoals } : {}),
      ...(command.affectedSystems !== undefined
        ? { affectedSystems: command.affectedSystems }
        : {}),
      ...(command.dependencies !== undefined ? { dependencies: command.dependencies } : {}),
      ...(command.decisionAuthority !== undefined
        ? { decisionAuthority: command.decisionAuthority }
        : {}),
      ...(command.unresolvedQuestions !== undefined
        ? { unresolvedQuestions: command.unresolvedQuestions }
        : {}),
    },
    {
      id: context.createId(),
      lineageId,
      createdAt: context.now(),
    },
  );

  await workItemStore.saveWorkItemVersion(workItem);
  return workItem;
}

export async function reviseWorkItemVersion(
  command: ReviseWorkItemCommand,
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

  await assertProjectInTenantScope(projectStore, latest.projectId, command.tenantContext);

  const revised = createWorkItemRevision(latest, command, {
    id: context.createId(),
    createdAt: context.now(),
  });

  await workItemStore.saveWorkItemVersion(revised);
  return revised;
}
