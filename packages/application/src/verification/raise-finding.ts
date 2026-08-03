import { createFinding, type Finding, type TenantContext } from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { FindingStore } from "./finding-store.js";

export interface RaiseFindingCommand {
  tenantContext: TenantContext;
  workItemId: string;
  category: string;
  severity: string;
  title: string;
  evidence: string;
  remediation: string;
}

async function assertWorkItemInTenantScope(
  workItemStore: WorkItemStore,
  workItemId: string,
  tenantContext: TenantContext,
): Promise<void> {
  const workItem = await workItemStore.findWorkItemVersionById(workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }
}

export async function raiseFinding(
  command: RaiseFindingCommand,
  workItemStore: WorkItemStore,
  findingStore: FindingStore,
  operationContext: IdentityOperationContext,
): Promise<Finding> {
  await assertWorkItemInTenantScope(workItemStore, command.workItemId, command.tenantContext);

  const finding = createFinding(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      category: command.category,
      severity: command.severity,
      title: command.title,
      evidence: command.evidence,
      remediation: command.remediation,
    },
    {
      id: operationContext.createId(),
      raisedAt: operationContext.now(),
    },
  );

  await findingStore.saveFinding(finding);
  return finding;
}
