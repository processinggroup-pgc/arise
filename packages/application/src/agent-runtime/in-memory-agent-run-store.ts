import type { AgentRun } from "@arise/domain";

import type { AgentRunStore } from "./agent-run-store.js";

export class InMemoryAgentRunStore implements AgentRunStore {
  private readonly runs = new Map<string, AgentRun>();

  saveAgentRun(run: AgentRun): Promise<void> {
    this.runs.set(run.id, run);
    return Promise.resolve();
  }

  findAgentRunById(id: string): Promise<AgentRun | undefined> {
    return Promise.resolve(this.runs.get(id));
  }

  listAgentRunsForWorkItem(workItemId: string): Promise<AgentRun[]> {
    return Promise.resolve(
      [...this.runs.values()]
        .filter((run) => run.workItemId === workItemId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
