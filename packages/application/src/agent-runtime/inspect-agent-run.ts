import type { AgentRun, AgentRunCheckpoint, TenantContext, ToolCall } from "@arise/domain";

import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunCheckpointStore } from "./agent-run-checkpoint-store.js";
import type { AgentRunStore } from "./agent-run-store.js";
import type { ToolCallStore } from "./tool-call-store.js";

export interface InspectAgentRunCommand {
  tenantContext: TenantContext;
  agentRunId: string;
}

export interface InspectAgentRunResult {
  run: AgentRun;
  checkpoints: AgentRunCheckpoint[];
  toolCalls: ToolCall[];
}

export async function inspectAgentRun(
  command: InspectAgentRunCommand,
  agentRunStore: AgentRunStore,
  checkpointStore: AgentRunCheckpointStore,
  toolCallStore: ToolCallStore,
): Promise<InspectAgentRunResult> {
  const run = await agentRunStore.findAgentRunById(command.agentRunId);
  if (run === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (run.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  const checkpoints = await checkpointStore.listCheckpointsForRun(command.agentRunId);
  const toolCalls = await toolCallStore.listToolCallsForAgentRun(command.agentRunId);

  return {
    run,
    checkpoints,
    toolCalls,
  };
}
