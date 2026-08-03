import { describe, expect, it } from "vitest";

import { createExecutionSession, createTenantContext } from "@arise/domain";

import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { ExecutionSessionScopeError } from "../execution/provision-execution-session.js";
import { FakeTestRunnerAdapter } from "./fake-test-runner-adapter.js";
import { InMemoryTestRunStore } from "./in-memory-test-run-store.js";
import { orchestrateVerification } from "./orchestrate-verification.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_verification",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("orchestrateVerification", () => {
  it("runs all verification categories and records tenant-scoped test runs", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const testRunStore = new InMemoryTestRunStore();

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "ready",
      },
      { id: "session_1", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    const result = await orchestrateVerification(
      {
        tenantContext,
        workItemId: "work_item_1",
        executionSessionId: session.id,
      },
      executionSessionStore,
      testRunStore,
      new FakeTestRunnerAdapter(),
      operationContext,
    );

    expect(result.plan.steps).toHaveLength(8);
    expect(result.runs).toHaveLength(8);
    expect(result.evaluation.passed).toBe(true);
    expect(await testRunStore.listTestRunsForExecutionSession(session.id)).toHaveLength(8);
  });

  it("reports failed categories when a category run fails", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const testRunStore = new InMemoryTestRunStore();

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "ready",
      },
      { id: "session_2", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    const result = await orchestrateVerification(
      {
        tenantContext,
        workItemId: "work_item_1",
        executionSessionId: session.id,
        categories: ["unit", "security"],
      },
      executionSessionStore,
      testRunStore,
      new FakeTestRunnerAdapter({
        security: { passed: 1, failed: 1, skipped: 0, durationMs: 900 },
      }),
      operationContext,
    );

    expect(result.evaluation.passed).toBe(false);
    expect(result.evaluation.failedCategories).toEqual(["security"]);
  });

  it("blocks orchestration when the execution session is outside tenant scope", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();

    const session = createExecutionSession(
      {
        organizationId: "org_other",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/other",
        state: "ready",
      },
      { id: "session_foreign", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    await expect(
      orchestrateVerification(
        {
          tenantContext,
          workItemId: "work_item_1",
          executionSessionId: session.id,
        },
        executionSessionStore,
        new InMemoryTestRunStore(),
        new FakeTestRunnerAdapter(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ExecutionSessionScopeError);
  });
});
