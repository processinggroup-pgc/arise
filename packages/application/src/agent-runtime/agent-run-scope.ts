import type { RetrievedContextItem, TenantContext } from "@arise/domain";

import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";

export function toAgentRunContextItems(items: RetrievedContextItem[]) {
  return items.map((item) => ({
    sourceType: item.sourceType,
    sourceRef: item.sourceRef,
    trustLevel: item.trustLevel,
    contentHash: item.contentHash,
    rank: item.rank,
  }));
}

export async function assertRepositoryLinkedToWorkItemProject(
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  workItemId: string,
  repositoryId: string,
  tenantContext: TenantContext,
): Promise<void> {
  const workItem = await workItemStore.findWorkItemVersionById(workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  const repository = await repositoryStore.findRepositoryById(repositoryId);
  if (repository === undefined) {
    throw new AgentRunScopeError("Repository was not found");
  }

  if (repository.organizationId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Repository is outside the tenant scope");
  }

  if (repository.projectId !== workItem.projectId) {
    throw new AgentRunScopeError("Repository is not linked to the work item project");
  }
}
