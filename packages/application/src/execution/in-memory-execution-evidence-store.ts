import type { ExecutionEvidence } from "@arise/domain";

import type { ExecutionEvidenceStore } from "./execution-evidence-store.js";

export class InMemoryExecutionEvidenceStore implements ExecutionEvidenceStore {
  private readonly evidence = new Map<string, ExecutionEvidence>();

  saveExecutionEvidence(record: ExecutionEvidence): Promise<void> {
    this.evidence.set(record.id, record);
    return Promise.resolve();
  }

  findExecutionEvidenceById(id: string): Promise<ExecutionEvidence | undefined> {
    return Promise.resolve(this.evidence.get(id));
  }

  listExecutionEvidenceForSession(executionSessionId: string): Promise<ExecutionEvidence[]> {
    return Promise.resolve(
      [...this.evidence.values()]
        .filter((record) => record.executionSessionId === executionSessionId)
        .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime()),
    );
  }

  listExecutionEvidenceForAgentRun(agentRunId: string): Promise<ExecutionEvidence[]> {
    return Promise.resolve(
      [...this.evidence.values()]
        .filter((record) => record.agentRunId === agentRunId)
        .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime()),
    );
  }
}
