import type { AgentRun } from "@arise/domain";

export interface AgentRunStore {
  saveAgentRun(run: AgentRun): Promise<void>;
  findAgentRunById(id: string): Promise<AgentRun | undefined>;
  listAgentRunsForWorkItem(workItemId: string): Promise<AgentRun[]>;
}
