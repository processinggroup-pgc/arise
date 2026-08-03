import type { ExecutionSession } from "@arise/domain";

import type { ExecutionSessionStore } from "./execution-session-store.js";

export class InMemoryExecutionSessionStore implements ExecutionSessionStore {
  private readonly sessions = new Map<string, ExecutionSession>();

  saveExecutionSession(session: ExecutionSession): Promise<void> {
    this.sessions.set(session.id, session);
    return Promise.resolve();
  }

  findExecutionSessionById(id: string): Promise<ExecutionSession | undefined> {
    return Promise.resolve(this.sessions.get(id));
  }

  listExecutionSessionsForWorkItem(workItemId: string): Promise<ExecutionSession[]> {
    return Promise.resolve(
      [...this.sessions.values()]
        .filter((session) => session.workItemId === workItemId)
        .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime()),
    );
  }
}
