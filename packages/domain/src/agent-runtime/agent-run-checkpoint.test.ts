import { describe, expect, it } from "vitest";

import { createAgentRunBudgetUsage } from "./tool-enforcement.js";
import { createAgentRunCheckpoint } from "./agent-run-checkpoint.js";

describe("agent run checkpoint", () => {
  it("records durable checkpoint state for resume", () => {
    const checkpoint = createAgentRunCheckpoint(
      {
        organizationId: "org_123",
        agentRunId: "run_1",
        phase: "context_retrieval",
        budgetUsage: createAgentRunBudgetUsage({ actionsUsed: 2, costUsdUsed: 0.04, tokensUsed: 900 }),
        completedSteps: ["retrieve_context", "validate_contract"],
      },
      {
        id: "checkpoint_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(checkpoint.phase).toBe("context_retrieval");
    expect(checkpoint.completedSteps).toHaveLength(2);
    expect(checkpoint.budgetUsage.actionsUsed).toBe(2);
  });
});
