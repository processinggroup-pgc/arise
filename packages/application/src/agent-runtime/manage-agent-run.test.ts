import { describe, expect, it } from "vitest";

import {
  createAgentRun,
  createAgentRunBudgetUsage,
  createTenantContext,
  startAgentRun,
} from "@arise/domain";

import { InMemoryAgentRunCheckpointStore } from "./in-memory-agent-run-checkpoint-store.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryToolCallStore } from "./in-memory-tool-call-store.js";
import { AgentRunCancellationError, cancelAgentRunForWorkItem } from "./cancel-agent-run.js";
import { checkpointAgentRun } from "./checkpoint-agent-run.js";
import { inspectAgentRun } from "./inspect-agent-run.js";
import { AgentRunResumeError, resumeAgentRunForWorkItem } from "./resume-agent-run.js";
import { AgentRunScopeError } from "./create-agent-run.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_run_lifecycle",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

async function seedRunningAgentRun(): Promise<{
  agentRunId: string;
  agentRunStore: InMemoryAgentRunStore;
  checkpointStore: InMemoryAgentRunCheckpointStore;
}> {
  const agentRunStore = new InMemoryAgentRunStore();
  const checkpointStore = new InMemoryAgentRunCheckpointStore();

  const run = startAgentRun(
    createAgentRun(
      {
        organizationId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentType: "discovery",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
      },
      {
        id: "run_1",
        createdAt: operationContext.now(),
      },
    ),
  );

  await agentRunStore.saveAgentRun(run);

  return {
    agentRunId: run.id,
    agentRunStore,
    checkpointStore,
  };
}

describe("durable agent run orchestration", () => {
  it("cancels a running agent run", async () => {
    const seeded = await seedRunningAgentRun();

    const cancelled = await cancelAgentRunForWorkItem(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
      },
      seeded.agentRunStore,
    );

    expect(cancelled.status).toBe("cancelled");
  });

  it("checkpoints a failed run and resumes from the latest checkpoint", async () => {
    const seeded = await seedRunningAgentRun();

    await checkpointAgentRun(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
        phase: "context_retrieval",
        budgetUsage: createAgentRunBudgetUsage({
          actionsUsed: 1,
          costUsdUsed: 0.02,
          tokensUsed: 500,
        }),
        completedSteps: ["retrieve_context"],
        markFailed: true,
      },
      seeded.agentRunStore,
      seeded.checkpointStore,
      operationContext,
    );

    const resumed = await resumeAgentRunForWorkItem(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
      },
      seeded.agentRunStore,
      seeded.checkpointStore,
    );

    expect(resumed.run.status).toBe("running");
    expect(resumed.checkpoint.phase).toBe("context_retrieval");
    expect(resumed.checkpoint.completedSteps).toContain("retrieve_context");
  });

  it("inspects run history with checkpoints", async () => {
    const seeded = await seedRunningAgentRun();

    await checkpointAgentRun(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
        phase: "repository_map",
        budgetUsage: createAgentRunBudgetUsage(),
        completedSteps: ["build_repository_map"],
      },
      seeded.agentRunStore,
      seeded.checkpointStore,
      operationContext,
    );

    const inspection = await inspectAgentRun(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
      },
      seeded.agentRunStore,
      seeded.checkpointStore,
      new InMemoryToolCallStore(),
    );

    expect(inspection.run.id).toBe(seeded.agentRunId);
    expect(inspection.checkpoints).toHaveLength(1);
  });

  it("blocks resume when no checkpoint exists", async () => {
    const seeded = await seedRunningAgentRun();

    await checkpointAgentRun(
      {
        tenantContext,
        agentRunId: seeded.agentRunId,
        phase: "context_retrieval",
        budgetUsage: createAgentRunBudgetUsage(),
        completedSteps: ["retrieve_context"],
        markFailed: true,
      },
      seeded.agentRunStore,
      seeded.checkpointStore,
      operationContext,
    );

    const emptyCheckpointStore = new InMemoryAgentRunCheckpointStore();

    await expect(
      resumeAgentRunForWorkItem(
        {
          tenantContext,
          agentRunId: seeded.agentRunId,
        },
        seeded.agentRunStore,
        emptyCheckpointStore,
      ),
    ).rejects.toBeInstanceOf(AgentRunResumeError);
  });

  it("blocks cancelling completed runs", async () => {
    const seeded = await seedRunningAgentRun();
    const existing = await seeded.agentRunStore.findAgentRunById(seeded.agentRunId);
    if (existing === undefined) {
      throw new Error("Expected agent run");
    }

    const completed = {
      ...existing,
      status: "completed" as const,
    };
    await seeded.agentRunStore.saveAgentRun(completed);

    await expect(
      cancelAgentRunForWorkItem(
        {
          tenantContext,
          agentRunId: seeded.agentRunId,
        },
        seeded.agentRunStore,
      ),
    ).rejects.toBeInstanceOf(AgentRunCancellationError);
  });

  it("blocks inspection outside tenant scope", async () => {
    const seeded = await seedRunningAgentRun();
    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      inspectAgentRun(
        {
          tenantContext: foreignTenant,
          agentRunId: seeded.agentRunId,
        },
        seeded.agentRunStore,
        seeded.checkpointStore,
        new InMemoryToolCallStore(),
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
