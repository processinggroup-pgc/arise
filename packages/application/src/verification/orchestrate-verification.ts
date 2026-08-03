import {
  buildTestRunArtifactRef,
  buildVerificationOrchestrationPlan,
  completeTestRun,
  createTestRun,
  evaluateVerificationOrchestrationResult,
  failTestRun,
  startTestRun,
  type TenantContext,
  type TestCategory,
  type TestRun,
  type VerificationOrchestrationPlan,
  type VerificationOrchestrationResult,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { ExecutionSessionScopeError } from "../execution/provision-execution-session.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { TestRunnerPort } from "./test-runner-port.js";
import type { TestRunStore } from "./test-run-store.js";

export interface OrchestrateVerificationCommand {
  tenantContext: TenantContext;
  workItemId: string;
  executionSessionId: string;
  categories?: TestCategory[];
}

export interface OrchestrateVerificationResult {
  plan: VerificationOrchestrationPlan;
  runs: TestRun[];
  evaluation: VerificationOrchestrationResult;
}

export async function orchestrateVerification(
  command: OrchestrateVerificationCommand,
  executionSessionStore: ExecutionSessionStore,
  testRunStore: TestRunStore,
  testRunnerPort: TestRunnerPort,
  operationContext: IdentityOperationContext,
): Promise<OrchestrateVerificationResult> {
  const session = await executionSessionStore.findExecutionSessionById(command.executionSessionId);
  if (session === undefined) {
    throw new ExecutionSessionScopeError("Execution session was not found");
  }

  if (session.organizationId !== command.tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Execution session is outside the tenant scope");
  }

  if (session.workItemId !== command.workItemId) {
    throw new ExecutionSessionScopeError("Execution session work item mismatch");
  }

  const plan = buildVerificationOrchestrationPlan(command.categories);
  const runs: TestRun[] = [];

  for (const step of plan.steps) {
    const pending = createTestRun(
      {
        organizationId: command.tenantContext.organizationId,
        executionSessionId: command.executionSessionId,
        workItemId: command.workItemId,
        category: step.category,
        command: step.command,
      },
      {
        id: operationContext.createId(),
        startedAt: operationContext.now(),
      },
    );
    await testRunStore.saveTestRun(pending);

    const running = startTestRun(pending);
    await testRunStore.saveTestRun(running);

    const outcome = await testRunnerPort.runCategory({
      category: step.category,
      command: step.command,
    });

    const artifactRef = buildTestRunArtifactRef(
      command.executionSessionId,
      step.category,
      running.id,
    );
    const endedAt = operationContext.now();

    const finished = outcome.passed
      ? completeTestRun(running, outcome.counts, outcome.durationMs, artifactRef, endedAt)
      : failTestRun(running, outcome.counts, outcome.durationMs, artifactRef, endedAt);

    await testRunStore.saveTestRun(finished);
    runs.push(finished);
  }

  return {
    plan,
    runs,
    evaluation: evaluateVerificationOrchestrationResult(runs),
  };
}
