import { describe, expect, it } from "vitest";

import {
  buildDiscoveryAgentInputContract,
  completeToolCall,
  createAgentRun,
  createAgentRunBudgetUsage,
  createTenantContext,
  createToolActionEnvelope,
} from "@arise/domain";

import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryToolCallStore } from "./in-memory-tool-call-store.js";
import {
  authorizeToolAction,
  ToolActionBlockedError,
  ToolBudgetExhaustedError,
} from "./authorize-tool-action.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_tool_auth",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

async function seedAuthorizedRun(): Promise<{
  agentRunId: string;
  inputContract: ReturnType<typeof buildDiscoveryAgentInputContract>;
  agentRunStore: InMemoryAgentRunStore;
  toolCallStore: InMemoryToolCallStore;
}> {
  const agentRunStore = new InMemoryAgentRunStore();
  const toolCallStore = new InMemoryToolCallStore();

  const inputContract = buildDiscoveryAgentInputContract("work_item_1", [
    {
      sourceType: "repository_file",
      sourceRef: "src/index.ts",
      trustLevel: "untrusted",
      contentHash: "hash_1",
      rank: 1,
    },
  ]);

  const run = createAgentRun(
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
  );

  await agentRunStore.saveAgentRun(run);

  return {
    agentRunId: run.id,
    inputContract,
    agentRunStore,
    toolCallStore,
  };
}

describe("authorizeToolAction", () => {
  it("authorizes allowlisted read tools and updates budget usage", async () => {
    const seeded = await seedAuthorizedRun();
    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentRunId: seeded.agentRunId,
        tool: "repository.read_file",
        arguments: { path: "src/index.ts" },
        purpose: "Inspect repository entrypoint",
        expectedEffect: "Return file contents",
        riskClass: "green",
        idempotencyKey: "read-index",
      },
      { actionId: "action_1" },
    );

    const result = await authorizeToolAction(
      {
        tenantContext,
        envelope,
        inputContract: seeded.inputContract,
        budgetUsage: createAgentRunBudgetUsage(),
      },
      seeded.agentRunStore,
      seeded.toolCallStore,
      operationContext,
    );

    expect(result.authorized).toBe(true);
    expect(result.budgetUsage.actionsUsed).toBe(1);
    expect(result.toolCall?.status).toBe("authorized");
  });

  it("blocks cancelled agent runs from authorizing tool actions", async () => {
    const seeded = await seedAuthorizedRun();
    const existing = await seeded.agentRunStore.findAgentRunById(seeded.agentRunId);
    if (existing === undefined) {
      throw new Error("Expected agent run");
    }

    await seeded.agentRunStore.saveAgentRun({ ...existing, status: "running" });

    const cancelled = { ...existing, status: "cancelled" as const };
    await seeded.agentRunStore.saveAgentRun(cancelled);

    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentRunId: seeded.agentRunId,
        tool: "repository.read_file",
        arguments: { path: "src/index.ts" },
        purpose: "Inspect repository entrypoint",
        expectedEffect: "Return file contents",
        riskClass: "green",
        idempotencyKey: "read-index-cancelled",
      },
      { actionId: "action_cancelled" },
    );

    await expect(
      authorizeToolAction(
        {
          tenantContext,
          envelope,
          inputContract: seeded.inputContract,
          budgetUsage: createAgentRunBudgetUsage(),
        },
        seeded.agentRunStore,
        seeded.toolCallStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ToolActionBlockedError);
  });

  it("blocks tools outside the agent run allowlist", async () => {
    const seeded = await seedAuthorizedRun();
    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentRunId: seeded.agentRunId,
        tool: "repository.write_file",
        arguments: { path: "src/index.ts", content: "malicious" },
        purpose: "Modify repository entrypoint",
        expectedEffect: "Write file contents",
        riskClass: "yellow",
        idempotencyKey: "write-index",
      },
      { actionId: "action_2" },
    );

    await expect(
      authorizeToolAction(
        {
          tenantContext,
          envelope,
          inputContract: seeded.inputContract,
          budgetUsage: createAgentRunBudgetUsage(),
        },
        seeded.agentRunStore,
        seeded.toolCallStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ToolActionBlockedError);
  });

  it("replays completed idempotent tool actions without consuming additional budget", async () => {
    const seeded = await seedAuthorizedRun();
    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentRunId: seeded.agentRunId,
        tool: "repository.read_file",
        arguments: { path: "src/index.ts" },
        purpose: "Inspect repository entrypoint",
        expectedEffect: "Return file contents",
        riskClass: "green",
        idempotencyKey: "read-index",
      },
      { actionId: "action_3" },
    );

    const first = await authorizeToolAction(
      {
        tenantContext,
        envelope,
        inputContract: seeded.inputContract,
        budgetUsage: createAgentRunBudgetUsage(),
      },
      seeded.agentRunStore,
      seeded.toolCallStore,
      operationContext,
    );

    if (first.toolCall === undefined) {
      throw new Error("Expected authorized tool call");
    }

    const completed = completeToolCall(first.toolCall, "evidence/read-index.json");
    await seeded.toolCallStore.saveToolCall(completed);

    const replay = await authorizeToolAction(
      {
        tenantContext,
        envelope,
        inputContract: seeded.inputContract,
        budgetUsage: first.budgetUsage,
      },
      seeded.agentRunStore,
      seeded.toolCallStore,
      operationContext,
    );

    expect(replay.idempotentReplay).toBe(true);
    expect(replay.budgetUsage.actionsUsed).toBe(first.budgetUsage.actionsUsed);
    expect(replay.toolCall?.evidenceRef).toBe("evidence/read-index.json");
  });

  it("blocks actions when the run budget is exhausted", async () => {
    const seeded = await seedAuthorizedRun();
    const exhaustedBudget = createAgentRunBudgetUsage({
      actionsUsed: seeded.inputContract.budget.maxActions,
    });

    const envelope = createToolActionEnvelope(
      {
        tenantId: tenantContext.organizationId,
        workItemId: "work_item_1",
        agentRunId: seeded.agentRunId,
        tool: "repository.search",
        arguments: { query: "membership" },
        purpose: "Search repository",
        expectedEffect: "Return search results",
        riskClass: "green",
        idempotencyKey: "search-membership",
      },
      { actionId: "action_4" },
    );

    await expect(
      authorizeToolAction(
        {
          tenantContext,
          envelope,
          inputContract: seeded.inputContract,
          budgetUsage: exhaustedBudget,
        },
        seeded.agentRunStore,
        seeded.toolCallStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ToolBudgetExhaustedError);
  });
});
