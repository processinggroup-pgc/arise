import type { AgentRunCheckpoint } from "@arise/domain";

export interface AgentRunCheckpointStore {
  saveCheckpoint(checkpoint: AgentRunCheckpoint): Promise<void>;
  findLatestCheckpointForRun(agentRunId: string): Promise<AgentRunCheckpoint | undefined>;
  listCheckpointsForRun(agentRunId: string): Promise<AgentRunCheckpoint[]>;
}
