import {
  buildIntentTraceabilityGraph,
  createTraceabilityLink,
  evaluateTraceabilityCoverage,
  type TenantContext,
  type TraceabilityGraph,
  type TraceabilityCoverageResult,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { WorkItemScopeError } from "../intent/create-work-item.js";
import { listRequirementsWithCriteriaForWorkItem } from "../intent/manage-requirements.js";
import type { RequirementStore } from "../intent/requirement-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { TraceabilityLinkStore } from "./traceability-link-store.js";

export interface BuildWorkItemTraceabilityCommand {
  tenantContext: TenantContext;
  workItemLineageId: string;
}

export interface BuildWorkItemTraceabilityResult {
  graph: TraceabilityGraph;
  coverage: TraceabilityCoverageResult;
}

export async function buildWorkItemTraceabilityGraph(
  command: BuildWorkItemTraceabilityCommand,
  workItemStore: WorkItemStore,
  requirementStore: RequirementStore,
  traceabilityLinkStore: TraceabilityLinkStore,
): Promise<BuildWorkItemTraceabilityResult> {
  const workItem = await workItemStore.findLatestByLineageId(command.workItemLineageId);
  if (workItem === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }

  const requirementsWithCriteria = await listRequirementsWithCriteriaForWorkItem(
    command.workItemLineageId,
    command.tenantContext,
    workItemStore,
    requirementStore,
  );

  const explicitLinks = await traceabilityLinkStore.listTraceabilityLinksForWorkItemLineage(
    command.tenantContext.organizationId,
    command.workItemLineageId,
  );

  const graph = buildIntentTraceabilityGraph({
    organizationId: command.tenantContext.organizationId,
    workItemLineageId: command.workItemLineageId,
    workItemTitle: workItem.title,
    requirements: requirementsWithCriteria.map((entry) => ({
      id: entry.requirement.id,
      statement: entry.requirement.statement,
      acceptanceCriteria: entry.acceptanceCriteria.map((criterion) => ({
        id: criterion.id,
        automatedTestRef: criterion.automatedTestRef,
      })),
    })),
    explicitLinks: explicitLinks.map((link) => ({
      sourceType: link.sourceType,
      sourceId: link.sourceId,
      targetType: link.targetType,
      targetId: link.targetId,
      relationship: link.relationship,
    })),
  });

  return {
    graph,
    coverage: evaluateTraceabilityCoverage(graph),
  };
}

export interface RecordTraceabilityLinkCommand {
  tenantContext: TenantContext;
  workItemLineageId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationship: string;
}

export async function recordTraceabilityLink(
  command: RecordTraceabilityLinkCommand,
  workItemStore: WorkItemStore,
  traceabilityLinkStore: TraceabilityLinkStore,
  context: IdentityOperationContext,
) {
  const workItem = await workItemStore.findLatestByLineageId(command.workItemLineageId);
  if (workItem === undefined) {
    throw new WorkItemScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new WorkItemScopeError("Work item is outside the tenant scope");
  }

  const link = createTraceabilityLink(
    {
      organizationId: command.tenantContext.organizationId,
      workItemLineageId: command.workItemLineageId,
      sourceType: command.sourceType,
      sourceId: command.sourceId,
      targetType: command.targetType,
      targetId: command.targetId,
      relationship: command.relationship,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await traceabilityLinkStore.saveTraceabilityLink(link);
  return link;
}
