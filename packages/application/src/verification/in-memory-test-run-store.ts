import type { TestRun } from "@arise/domain";

import type { TestRunStore } from "./test-run-store.js";

export class InMemoryTestRunStore implements TestRunStore {
  private readonly runs = new Map<string, TestRun>();

  saveTestRun(run: TestRun): Promise<void> {
    this.runs.set(run.id, run);
    return Promise.resolve();
  }

  findTestRunById(id: string): Promise<TestRun | undefined> {
    return Promise.resolve(this.runs.get(id));
  }

  listTestRunsForExecutionSession(executionSessionId: string): Promise<TestRun[]> {
    return Promise.resolve(
      [...this.runs.values()]
        .filter((run) => run.executionSessionId === executionSessionId)
        .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime()),
    );
  }

  listTestRunsForWorkItem(workItemId: string): Promise<TestRun[]> {
    return Promise.resolve(
      [...this.runs.values()]
        .filter((run) => run.workItemId === workItemId)
        .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime()),
    );
  }
}
