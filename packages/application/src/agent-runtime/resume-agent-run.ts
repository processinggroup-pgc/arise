import {
  resumeAgentRun,
  type AgentRun,
  type AgentRunCheckpoint,
  type TenantContext,
} from "@arise/domain";

import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunCheckpointStore } from "./agent-run-checkpoint-store.js";
import type { AgentRunStore } from "./agent-run-store.js";

export interface ResumeAgentRunCommand {
  tenantContext: TenantContext;
  agentRunId: string;
}

export interface ResumeAgentRunResult {
  run: AgentRun;
  checkpoint: AgentRunCheckpoint;
}

export class AgentRunResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRunResumeError";
  }
}

export async function resumeAgentRunForWorkItem(
  command: ResumeAgentRunCommand,
  agentRunStore: AgentRunStore,
  checkpointStore: AgentRunCheckpointStore,
): Promise<ResumeAgentRunResult> {
  const run = await agentRunStore.findAgentRunById(command.agentRunId);
  if (run === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (run.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  const checkpoint = await checkpointStore.findLatestCheckpointForRun(command.agentRunId);
  if (checkpoint === undefined) {
    throw new AgentRunResumeError("Agent run checkpoint was not found");
  }

  try {
    const resumed = resumeAgentRun(run);
    await agentRunStore.saveAgentRun(resumed);

    return {
      run: resumed,
      checkpoint,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new AgentRunResumeError(error.message);
    }

    throw error;
  }
}
