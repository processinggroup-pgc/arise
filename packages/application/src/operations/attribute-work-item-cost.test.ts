import { describe, expect, it } from "vitest";

import {
  completeToolCall,
  createAgentRun,
  createExecutionSession,
  createTenantContext,
  createToolCall,
} from "@arise/domain";

import { InMemoryAgentRunStore } from "../agent-runtime/in-memory-agent-run-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import { InMemoryToolCallStore } from "../agent-runtime/in-memory-tool-call-store.js";
import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { attributeWorkItemCost } from "./attribute-work-item-cost.js";
import { InMemoryCostAttributionStore } from "./in-memory-cost-attribution-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_cost_attr",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:05:00.000Z"),
};

const workItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 1,
  title: "Improve membership onboarding",
  type: "feature" as const,
  state: "verifying" as const,
  riskLevel: "high" as const,
  ownerId: "user_owner",
  problemStatement: "Onboarding is fragmented.",
  targetUser: "Platform engineer",
  currentBehavior: "Manual onboarding.",
  desiredBehavior: "Single workflow onboarding.",
  measurableOutcome: "One path onboarding.",
  dataClassification: "internal" as const,
  constraints: [],
  nonGoals: [],
  affectedSystems: ["memberships API"],
  dependencies: [],
  decisionAuthority: "user_owner",
  unresolvedQuestions: [],
  acceptanceCriteria: [
    {
      given: "A new member account",
      when: "They start onboarding",
      then: "The workflow completes in one path",
    },
  ],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

describe("attributeWorkItemCost", () => {
  it("attributes model, build and sandbox cost for a tenant-scoped work item", async () => {
    const workItemStore = new InMemoryWorkItemStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const toolCallStore = new InMemoryToolCallStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const costAttributionStore = new InMemoryCostAttributionStore();

    await workItemStore.saveWorkItemVersion(workItem);

    const run = createAgentRun(
      {
        organizationId: tenantContext.organizationId,
        workItemId: workItem.id,
        agentType: "coding",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
        tokenUsage: 12_000,
        costUsd: 1.25,
        status: "completed",
      },
      { id: "run_1", createdAt: new Date("2026-08-03T12:00:00.000Z") },
    );
    await agentRunStore.saveAgentRun(run);

    const toolCall = completeToolCall(
      createToolCall(
        {
          organizationId: tenantContext.organizationId,
          agentRunId: run.id,
          toolName: "build.run",
          argumentsRedacted: { target: "app" },
          idempotencyKey: "build_1",
          decision: "allowed",
          status: "authorized",
        },
        { id: "tool_1", createdAt: new Date("2026-08-03T12:01:00.000Z") },
      ),
      "artifacts/build.log",
    );
    await toolCallStore.saveToolCall(toolCall);

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: workItem.id,
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "completed",
      },
      { id: "session_1", startedAt: new Date("2026-08-03T12:00:00.000Z") },
    );
    await executionSessionStore.saveExecutionSession({
      ...session,
      endedAt: new Date("2026-08-03T12:05:00.000Z"),
    });

    const result = await attributeWorkItemCost(
      {
        tenantContext,
        workItemId: workItem.id,
      },
      workItemStore,
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      costAttributionStore,
      operationContext,
    );

    expect(result.attribution.organizationId).toBe("org_123");
    expect(result.attribution.workItemId).toBe("work_item_1");
    expect(result.attribution.modelCostUsd).toBe(1.25);
    expect(result.attribution.buildCostUsd).toBe(0.15);
    expect(result.attribution.sandboxCostUsd).toBe(0.25);
    expect(result.attribution.totalCostUsd).toBe(1.65);
    expect(result.attribution.lineItems).toHaveLength(3);
  });

  it("rejects work items outside the tenant scope", async () => {
    const workItemStore = new InMemoryWorkItemStore();
    await workItemStore.saveWorkItemVersion(workItem);

    await expect(
      attributeWorkItemCost(
        {
          tenantContext: createTenantContext({
            organizationId: "org_other",
            userId: "user_owner",
            correlationId: "corr_other",
          }),
          workItemId: workItem.id,
        },
        workItemStore,
        new InMemoryAgentRunStore(),
        new InMemoryToolCallStore(),
        new InMemoryExecutionSessionStore(),
        new InMemoryCostAttributionStore(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
