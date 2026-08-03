import type { ExecutionSession } from "@arise/domain";

export interface ExecutionSessionStore {
  saveExecutionSession(session: ExecutionSession): Promise<void>;
  findExecutionSessionById(id: string): Promise<ExecutionSession | undefined>;
  listExecutionSessionsForWorkItem(workItemId: string): Promise<ExecutionSession[]>;
}
