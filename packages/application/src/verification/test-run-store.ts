import type { TestRun } from "@arise/domain";

export interface TestRunStore {
  saveTestRun(run: TestRun): Promise<void>;
  findTestRunById(id: string): Promise<TestRun | undefined>;
  listTestRunsForExecutionSession(executionSessionId: string): Promise<TestRun[]>;
  listTestRunsForWorkItem(workItemId: string): Promise<TestRun[]>;
}
