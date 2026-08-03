import {
  aggregateCostAttribution,
  attributeBuildCostFromToolCall,
  attributeModelCostFromAgentRun,
  attributeSandboxCostFromExecutionSession,
  createCostAttributionRecord,
  type CostAttributionRecord,
  type TenantContext,
} from "@arise/domain";

import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { ToolCallStore } from "../agent-runtime/tool-call-store.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { CostAttributionStore } from "./cost-attribution-store.js";

export interface AttributeWorkItemCostCommand {
  tenantContext: TenantContext;
  workItemId: string;
}

export interface AttributeWorkItemCostResult {
  attribution: CostAttributionRecord;
}

export async function attributeWorkItemCost(
  command: AttributeWorkItemCostCommand,
  workItemStore: WorkItemStore,
  agentRunStore: AgentRunStore,
  toolCallStore: ToolCallStore,
  executionSessionStore: ExecutionSessionStore,
  costAttributionStore: CostAttributionStore,
  operationContext: IdentityOperationContext,
): Promise<AttributeWorkItemCostResult> {
  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  const agentRuns = await agentRunStore.listAgentRunsForWorkItem(command.workItemId);
  const executionSessions = await executionSessionStore.listExecutionSessionsForWorkItem(
    command.workItemId,
  );

  const lineItems = [];

  for (const run of agentRuns) {
    const modelLineItem = attributeModelCostFromAgentRun(run);
    if (modelLineItem !== null) {
      lineItems.push(modelLineItem);
    }

    const toolCalls = await toolCallStore.listToolCallsForAgentRun(run.id);
    for (const toolCall of toolCalls) {
      const buildLineItem = attributeBuildCostFromToolCall(toolCall);
      if (buildLineItem !== null) {
        lineItems.push(buildLineItem);
      }
    }
  }

  for (const session of executionSessions) {
    const sandboxLineItem = attributeSandboxCostFromExecutionSession(
      session,
      operationContext.now(),
    );
    if (sandboxLineItem !== null) {
      lineItems.push(sandboxLineItem);
    }
  }

  const aggregated = aggregateCostAttribution({
    organizationId: command.tenantContext.organizationId,
    workItemId: command.workItemId,
    lineItems,
  });

  const attribution = createCostAttributionRecord(aggregated, {
    id: operationContext.createId(),
    attributedAt: operationContext.now(),
  });

  await costAttributionStore.saveCostAttribution(attribution);

  return { attribution };
}
