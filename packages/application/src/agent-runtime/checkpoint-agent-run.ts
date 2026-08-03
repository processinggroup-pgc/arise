import {
  createAgentRunCheckpoint,
  failAgentRun,
  type AgentRunBudgetUsage,
  type AgentRunCheckpoint,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunCheckpointStore } from "./agent-run-checkpoint-store.js";
import type { AgentRunStore } from "./agent-run-store.js";

export interface CheckpointAgentRunCommand {
  tenantContext: TenantContext;
  agentRunId: string;
  phase: string;
  budgetUsage: AgentRunBudgetUsage;
  completedSteps: string[];
  markFailed?: boolean;
}

export async function checkpointAgentRun(
  command: CheckpointAgentRunCommand,
  agentRunStore: AgentRunStore,
  checkpointStore: AgentRunCheckpointStore,
  operationContext: IdentityOperationContext,
): Promise<AgentRunCheckpoint> {
  const run = await agentRunStore.findAgentRunById(command.agentRunId);
  if (run === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (run.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  if (run.status === "cancelled" || run.status === "completed") {
    throw new AgentRunScopeError("Terminal agent runs cannot be checkpointed");
  }

  const checkpoint = createAgentRunCheckpoint(
    {
      organizationId: command.tenantContext.organizationId,
      agentRunId: command.agentRunId,
      phase: command.phase,
      budgetUsage: command.budgetUsage,
      completedSteps: command.completedSteps,
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await checkpointStore.saveCheckpoint(checkpoint);

  if (command.markFailed === true) {
    const failed = failAgentRun(run);
    await agentRunStore.saveAgentRun(failed);
  }

  return checkpoint;
}
