import type { TestCategory, TestRunCounts } from "@arise/domain";

export interface RunTestCategoryRequest {
  category: TestCategory;
  command: string;
}

export interface RunTestCategoryResult {
  category: TestCategory;
  command: string;
  passed: boolean;
  counts: TestRunCounts;
  durationMs: number;
}

export interface TestRunnerPort {
  runCategory(request: RunTestCategoryRequest): Promise<RunTestCategoryResult>;
}
