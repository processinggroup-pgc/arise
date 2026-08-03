import {
  buildAutomatedTestRef,
  createRequirement,
  createRequirementAcceptanceCriterion,
  type Requirement,
  type RequirementAcceptanceCriterion,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { RequirementStore } from "./requirement-store.js";
import type { WorkItemStore } from "./work-item-store.js";
import { WorkItemScopeError } from "./create-work-item.js";

export interface CreateRequirementCommand {
  tenantContext: TenantContext;
  workItemLineageId: string;
  kind: string;
  statement: string;
  priority: string;
  source: string;
}

export interface AddRequirementAcceptanceCriterionCommand {
  tenantContext: TenantContext;
  requirementId: string;
  given: string;
  when: string;
  then: string;
  automatedTestRef?: string;
}

async function assertWorkItemLineageInTenantScope(
  workItemStore: WorkItemStore,
  workItemLineageId: string,
  tenantContext: TenantContext,
): Promise<void> {
  const workItem = await workItemStore.findLatestByLineageId(workItemLineageId);
  if (workItem === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (workItem.organizationId !== tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }
}

export async function createRequirementForWorkItem(
  command: CreateRequirementCommand,
  workItemStore: WorkItemStore,
  requirementStore: RequirementStore,
  context: IdentityOperationContext,
): Promise<Requirement> {
  await assertWorkItemLineageInTenantScope(
    workItemStore,
    command.workItemLineageId,
    command.tenantContext,
  );

  const requirement = createRequirement(
    {
      workItemLineageId: command.workItemLineageId,
      organizationId: command.tenantContext.organizationId,
      kind: command.kind,
      statement: command.statement,
      priority: command.priority,
      source: command.source,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await requirementStore.saveRequirement(requirement);
  return requirement;
}

export async function addAcceptanceCriterionToRequirement(
  command: AddRequirementAcceptanceCriterionCommand,
  requirementStore: RequirementStore,
  context: IdentityOperationContext,
): Promise<RequirementAcceptanceCriterion> {
  const requirement = await requirementStore.findRequirementById(command.requirementId);
  if (requirement === undefined) {
    throw new WorkItemScopeError("Requirement was not found");
  }

  if (requirement.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Requirement is outside the tenant scope");
  }

  const existingCriteria = await requirementStore.listAcceptanceCriteriaForRequirement(
    requirement.id,
  );
  const requirementsForLineage = await requirementStore.listRequirementsForWorkItemLineage(
    requirement.workItemLineageId,
  );
  const requirementSequence =
    requirementsForLineage.findIndex((entry) => entry.id === requirement.id) + 1;
  const automatedTestRef =
    command.automatedTestRef ??
    buildAutomatedTestRef({
      workItemLineageId: requirement.workItemLineageId,
      requirementSequence,
      criterionSequence: existingCriteria.length + 1,
    });

  const duplicateRef = await requirementStore.findAcceptanceCriterionByTestRef(
    command.tenantContext.organizationId,
    automatedTestRef,
  );
  if (duplicateRef !== undefined) {
    throw new Error("Automated test reference is already in use");
  }

  const criterion = createRequirementAcceptanceCriterion(
    {
      requirementId: requirement.id,
      organizationId: command.tenantContext.organizationId,
      given: command.given,
      when: command.when,
      then: command.then,
      automatedTestRef,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await requirementStore.saveAcceptanceCriterion(criterion);
  return criterion;
}

export async function listRequirementsWithCriteriaForWorkItem(
  workItemLineageId: string,
  tenantContext: TenantContext,
  workItemStore: WorkItemStore,
  requirementStore: RequirementStore,
): Promise<
  Array<{
    requirement: Requirement;
    acceptanceCriteria: RequirementAcceptanceCriterion[];
  }>
> {
  await assertWorkItemLineageInTenantScope(workItemStore, workItemLineageId, tenantContext);

  const requirements = await requirementStore.listRequirementsForWorkItemLineage(workItemLineageId);

  return Promise.all(
    requirements.map(async (requirement) => ({
      requirement,
      acceptanceCriteria: await requirementStore.listAcceptanceCriteriaForRequirement(
        requirement.id,
      ),
    })),
  );
}
