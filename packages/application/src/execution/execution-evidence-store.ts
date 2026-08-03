import type { ExecutionEvidence } from "@arise/domain";

export interface ExecutionEvidenceStore {
  saveExecutionEvidence(evidence: ExecutionEvidence): Promise<void>;
  findExecutionEvidenceById(id: string): Promise<ExecutionEvidence | undefined>;
  listExecutionEvidenceForSession(executionSessionId: string): Promise<ExecutionEvidence[]>;
  listExecutionEvidenceForAgentRun(agentRunId: string): Promise<ExecutionEvidence[]>;
}
