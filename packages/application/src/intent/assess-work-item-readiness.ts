import {
  buildReadinessEvaluationInput,
  evaluateWorkItemReadiness,
  type ReadinessEvaluationResult,
  type TenantContext,
  type WorkItem,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "../project/project-store.js";
import { WorkItemScopeError } from "./create-work-item.js";
import { listRequirementsWithCriteriaForWorkItem } from "./manage-requirements.js";
import type { RequirementStore } from "./requirement-store.js";
import { applyWorkItemTransition } from "./transition-work-item-state.js";
import type { WorkItemStore } from "./work-item-store.js";

export interface AssessWorkItemReadinessCommand {
  tenantContext: TenantContext;
  lineageId: string;
}

export interface AssessWorkItemReadinessResult {
  evaluation: ReadinessEvaluationResult;
  workItem: WorkItem;
}

export class WorkItemAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkItemAssessmentError";
  }
}

export async function assessWorkItemReadiness(
  command: AssessWorkItemReadinessCommand,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  requirementStore: RequirementStore,
  context: IdentityOperationContext,
): Promise<AssessWorkItemReadinessResult> {
  let workItem = await workItemStore.findLatestByLineageId(command.lineageId);
  if (workItem === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }

  if (workItem.state === "draft") {
    workItem = await applyWorkItemTransition(
      {
        tenantContext: command.tenantContext,
        lineageId: command.lineageId,
        transition: "start_assessment",
      },
      projectStore,
      workItemStore,
      context,
    );
  }

  if (workItem.state !== "assessing") {
    throw new WorkItemAssessmentError("Work item must be in assessing state");
  }

  const requirements = await listRequirementsWithCriteriaForWorkItem(
    command.lineageId,
    command.tenantContext,
    workItemStore,
    requirementStore,
  );
  const linkedAcceptanceCriteriaCount = requirements.reduce(
    (total, entry) => total + entry.acceptanceCriteria.length,
    0,
  );

  const evaluation = evaluateWorkItemReadiness(
    buildReadinessEvaluationInput({
      workItem,
      linkedAcceptanceCriteriaCount,
    }),
  );

  const transitionedWorkItem = await applyWorkItemTransition(
    {
      tenantContext: command.tenantContext,
      lineageId: command.lineageId,
      transition: evaluation.ready ? "readiness_passed" : "readiness_failed",
    },
    projectStore,
    workItemStore,
    context,
  );

  return {
    evaluation,
    workItem: transitionedWorkItem,
  };
}
