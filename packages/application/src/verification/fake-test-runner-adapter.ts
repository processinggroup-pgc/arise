import type { TestCategory } from "@arise/domain";

import type { RunTestCategoryRequest, RunTestCategoryResult, TestRunnerPort } from "./test-runner-port.js";

interface FakeTestCategoryOutcome {
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

const DEFAULT_OUTCOMES: Record<TestCategory, FakeTestCategoryOutcome> = {
  unit: { passed: 12, failed: 0, skipped: 0, durationMs: 800 },
  component: { passed: 6, failed: 0, skipped: 0, durationMs: 600 },
  integration: { passed: 4, failed: 0, skipped: 0, durationMs: 1200 },
  contract: { passed: 3, failed: 0, skipped: 0, durationMs: 500 },
  migration: { passed: 5, failed: 0, skipped: 0, durationMs: 400 },
  security: { passed: 2, failed: 0, skipped: 0, durationMs: 1500 },
  architecture: { passed: 4, failed: 0, skipped: 0, durationMs: 300 },
  acceptance: { passed: 1, failed: 0, skipped: 0, durationMs: 2000 },
};

export class FakeTestRunnerAdapter implements TestRunnerPort {
  private readonly outcomes: Record<TestCategory, FakeTestCategoryOutcome>;

  constructor(outcomes: Partial<Record<TestCategory, FakeTestCategoryOutcome>> = {}) {
    this.outcomes = { ...DEFAULT_OUTCOMES, ...outcomes };
  }

  runCategory(request: RunTestCategoryRequest): Promise<RunTestCategoryResult> {
    const outcome = this.outcomes[request.category];
    const total = outcome.passed + outcome.failed + outcome.skipped;

    return Promise.resolve({
      category: request.category,
      command: request.command,
      passed: outcome.failed === 0,
      counts: {
        passed: outcome.passed,
        failed: outcome.failed,
        skipped: outcome.skipped,
        total,
      },
      durationMs: outcome.durationMs,
    });
  }
}
