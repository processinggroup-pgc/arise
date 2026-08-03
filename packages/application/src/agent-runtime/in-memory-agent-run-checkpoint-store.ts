import type { AgentRunCheckpoint } from "@arise/domain";

import type { AgentRunCheckpointStore } from "./agent-run-checkpoint-store.js";

export class InMemoryAgentRunCheckpointStore implements AgentRunCheckpointStore {
  private readonly checkpoints = new Map<string, AgentRunCheckpoint>();

  saveCheckpoint(checkpoint: AgentRunCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
    return Promise.resolve();
  }

  findLatestCheckpointForRun(agentRunId: string): Promise<AgentRunCheckpoint | undefined> {
    const checkpoints = [...this.checkpoints.values()]
      .filter((checkpoint) => checkpoint.agentRunId === agentRunId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return Promise.resolve(checkpoints[0]);
  }

  listCheckpointsForRun(agentRunId: string): Promise<AgentRunCheckpoint[]> {
    return Promise.resolve(
      [...this.checkpoints.values()]
        .filter((checkpoint) => checkpoint.agentRunId === agentRunId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
