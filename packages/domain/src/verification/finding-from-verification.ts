import type { TestCategory, TestRun } from "./test-run.js";
import { TEST_CATEGORIES } from "./test-run.js";
import type { VerificationOrchestrationResult } from "./verification-orchestration.js";
import type { FindingCategory, FindingSeverity } from "./finding.js";

export interface BuildFindingFromFailedTestRunInput {
  organizationId: string;
  workItemId: string;
  run: TestRun;
}

const TEST_CATEGORY_TO_FINDING_CATEGORY: Record<TestCategory, FindingCategory> = {
  unit: "test",
  component: "quality",
  integration: "test",
  contract: "architecture",
  migration: "architecture",
  security: "security",
  architecture: "architecture",
  acceptance: "quality",
};

const TEST_CATEGORY_TO_FINDING_SEVERITY: Record<TestCategory, FindingSeverity> = {
  unit: "medium",
  component: "medium",
  integration: "medium",
  contract: "high",
  migration: "high",
  security: "high",
  architecture: "high",
  acceptance: "high",
};

export function mapTestCategoryToFindingCategory(category: TestCategory): FindingCategory {
  return TEST_CATEGORY_TO_FINDING_CATEGORY[category];
}

export function mapTestCategoryToFindingSeverity(category: TestCategory): FindingSeverity {
  return TEST_CATEGORY_TO_FINDING_SEVERITY[category];
}

export function buildFindingTitleForFailedTestRun(run: TestRun): string {
  return `Verification failed for ${run.category} tests`;
}

export function buildFindingRemediationForFailedTestRun(run: TestRun): string {
  return `Fix failing ${run.category} tests and re-run ${run.command}`;
}

export function buildFindingEvidenceFromTestRun(run: TestRun): string {
  if (run.artifactRef.trim().length > 0) {
    return run.artifactRef;
  }

  return `verification/${run.executionSessionId}/${run.category}/${run.id}.json`;
}

export function listFailedTestRuns(runs: TestRun[]): TestRun[] {
  return runs.filter((run) => run.status === "failed");
}

export function shouldRaiseFindingsFromVerification(
  evaluation: VerificationOrchestrationResult,
): boolean {
  return !evaluation.passed && evaluation.failedCategories.length > 0;
}

export function assertTestCategoryForFinding(category: string): TestCategory {
  if (!(TEST_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Test category is invalid");
  }

  return category as TestCategory;
}
