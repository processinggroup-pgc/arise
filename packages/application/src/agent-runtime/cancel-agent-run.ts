import {
  cancelAgentRun,
  type AgentRun,
  type TenantContext,
} from "@arise/domain";

import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunStore } from "./agent-run-store.js";

export interface CancelAgentRunCommand {
  tenantContext: TenantContext;
  agentRunId: string;
}

export class AgentRunCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRunCancellationError";
  }
}

export async function cancelAgentRunForWorkItem(
  command: CancelAgentRunCommand,
  agentRunStore: AgentRunStore,
): Promise<AgentRun> {
  const run = await agentRunStore.findAgentRunById(command.agentRunId);
  if (run === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (run.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  try {
    const cancelled = cancelAgentRun(run);
    await agentRunStore.saveAgentRun(cancelled);
    return cancelled;
  } catch (error) {
    if (error instanceof Error) {
      throw new AgentRunCancellationError(error.message);
    }

    throw error;
  }
}
