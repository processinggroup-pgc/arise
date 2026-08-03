import type { TestCategory, TestRun } from "./test-run.js";
import { TEST_CATEGORIES } from "./test-run.js";

export interface VerificationOrchestrationStep {
  sequence: number;
  category: TestCategory;
  command: string;
}

export interface VerificationOrchestrationPlan {
  categories: TestCategory[];
  steps: VerificationOrchestrationStep[];
}

export interface VerificationOrchestrationResult {
  passed: boolean;
  completedCategories: TestCategory[];
  failedCategories: TestCategory[];
}

export const PLATFORM_TEST_CATEGORY_COMMANDS: Record<TestCategory, string> = {
  unit: "pnpm test:unit",
  component: "pnpm test:component",
  integration: "pnpm test:integration",
  contract: "pnpm test:contract",
  migration: "pnpm test:architecture",
  security: "pnpm test:integration",
  architecture: "pnpm test:architecture",
  acceptance: "pnpm test:e2e",
};

export const PLATFORM_VERIFICATION_CATEGORY_ORDER: TestCategory[] = [
  "unit",
  "component",
  "architecture",
  "integration",
  "contract",
  "migration",
  "security",
  "acceptance",
];

export function buildVerificationOrchestrationPlan(
  categories: TestCategory[] = PLATFORM_VERIFICATION_CATEGORY_ORDER,
): VerificationOrchestrationPlan {
  const normalizedCategories = categories.filter((category, index, all) => {
    return (TEST_CATEGORIES as readonly string[]).includes(category) && all.indexOf(category) === index;
  });

  if (normalizedCategories.length === 0) {
    throw new Error("Verification orchestration categories are required");
  }

  const steps = normalizedCategories.map((category, index) => ({
    sequence: index + 1,
    category,
    command: PLATFORM_TEST_CATEGORY_COMMANDS[category],
  }));

  return {
    categories: normalizedCategories,
    steps,
  };
}

export function evaluateVerificationOrchestrationResult(runs: TestRun[]): VerificationOrchestrationResult {
  const completedCategories: TestCategory[] = [];
  const failedCategories: TestCategory[] = [];

  for (const run of runs) {
    if (run.status === "passed") {
      completedCategories.push(run.category);
      continue;
    }

    if (run.status === "failed") {
      failedCategories.push(run.category);
    }
  }

  return {
    passed: failedCategories.length === 0 && completedCategories.length === runs.length && runs.length > 0,
    completedCategories,
    failedCategories,
  };
}
