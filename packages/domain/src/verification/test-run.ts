export const TEST_CATEGORIES = [
  "unit",
  "component",
  "integration",
  "contract",
  "migration",
  "security",
  "architecture",
  "acceptance",
] as const;

export type TestCategory = (typeof TEST_CATEGORIES)[number];

export const TEST_RUN_STATUSES = ["pending", "running", "passed", "failed", "skipped"] as const;

export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number];

export interface TestRunCounts {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface TestRun {
  id: string;
  organizationId: string;
  executionSessionId: string;
  workItemId: string;
  category: TestCategory;
  command: string;
  status: TestRunStatus;
  counts: TestRunCounts;
  durationMs: number;
  artifactRef: string;
  startedAt: Date;
  endedAt?: Date;
}

export interface CreateTestRunInput {
  organizationId: string;
  executionSessionId: string;
  workItemId: string;
  category: string;
  command: string;
}

export interface CreateTestRunMetadata {
  id: string;
  startedAt: Date;
}

function assertTestCategory(category: string): TestCategory {
  if (!(TEST_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Test category is invalid");
  }

  return category as TestCategory;
}

function assertTestRunCounts(counts: TestRunCounts): TestRunCounts {
  if (counts.passed < 0 || counts.failed < 0 || counts.skipped < 0 || counts.total < 0) {
    throw new Error("Test run counts cannot be negative");
  }

  if (counts.passed + counts.failed + counts.skipped !== counts.total) {
    throw new Error("Test run counts are inconsistent");
  }

  return counts;
}

export function createTestRun(input: CreateTestRunInput, metadata: CreateTestRunMetadata): TestRun {
  const organizationId = input.organizationId.trim();
  const executionSessionId = input.executionSessionId.trim();
  const workItemId = input.workItemId.trim();
  const command = input.command.trim();

  if (organizationId.length === 0 || executionSessionId.length === 0 || workItemId.length === 0) {
    throw new Error("Test run identifiers are required");
  }

  if (command.length === 0) {
    throw new Error("Test run command is required");
  }

  return {
    id: metadata.id,
    organizationId,
    executionSessionId,
    workItemId,
    category: assertTestCategory(input.category.trim()),
    command,
    status: "pending",
    counts: { passed: 0, failed: 0, skipped: 0, total: 0 },
    durationMs: 0,
    artifactRef: "",
    startedAt: metadata.startedAt,
  };
}

export function startTestRun(run: TestRun): TestRun {
  if (run.status !== "pending") {
    throw new Error("Only pending test runs can be started");
  }

  return {
    ...run,
    status: "running",
  };
}

export function completeTestRun(
  run: TestRun,
  counts: TestRunCounts,
  durationMs: number,
  artifactRef: string,
  endedAt: Date,
): TestRun {
  if (run.status !== "running") {
    throw new Error("Only running test runs can be completed");
  }

  if (durationMs < 0) {
    throw new Error("Test run duration cannot be negative");
  }

  const normalizedArtifactRef = artifactRef.trim();
  if (normalizedArtifactRef.length === 0) {
    throw new Error("Test run artifact reference is required");
  }

  return {
    ...run,
    status: "passed",
    counts: assertTestRunCounts(counts),
    durationMs,
    artifactRef: normalizedArtifactRef,
    endedAt,
  };
}

export function failTestRun(
  run: TestRun,
  counts: TestRunCounts,
  durationMs: number,
  artifactRef: string,
  endedAt: Date,
): TestRun {
  if (run.status !== "running") {
    throw new Error("Only running test runs can fail");
  }

  if (durationMs < 0) {
    throw new Error("Test run duration cannot be negative");
  }

  const normalizedArtifactRef = artifactRef.trim();
  if (normalizedArtifactRef.length === 0) {
    throw new Error("Test run artifact reference is required");
  }

  return {
    ...run,
    status: "failed",
    counts: assertTestRunCounts(counts),
    durationMs,
    artifactRef: normalizedArtifactRef,
    endedAt,
  };
}

export function buildTestRunArtifactRef(
  executionSessionId: string,
  category: TestCategory,
  testRunId: string,
): string {
  return `verification/${executionSessionId}/${category}/${testRunId}.json`;
}
