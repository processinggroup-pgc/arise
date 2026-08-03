import { describe, expect, it } from "vitest";

import {
  applyBudgetConsumption,
  createAgentRunBudgetUsage,
  evaluateToolActionRequest,
} from "./tool-enforcement.js";

describe("tool enforcement", () => {
  const budget = {
    maxActions: 3,
    maxCostUsd: 1,
    maxTokens: 2_000,
  };

  it("blocks tools outside the agent run allowlist", () => {
    const evaluation = evaluateToolActionRequest({
      tool: "repository.write_file",
      allowedTools: ["repository.read_file", "repository.search"],
      budget,
      budgetUsage: createAgentRunBudgetUsage(),
    });

    expect(evaluation.decision).toBe("blocked");
    expect(evaluation.ruleIds).toContain("platform.tool.allowlist");
  });

  it("allows read tools that fit within the run budget", () => {
    const evaluation = evaluateToolActionRequest({
      tool: "repository.read_file",
      allowedTools: ["repository.read_file", "repository.search"],
      budget,
      budgetUsage: createAgentRunBudgetUsage(),
    });

    expect(evaluation.decision).toBe("allowed");
  });

  it("blocks actions when the action budget is exhausted", () => {
    const evaluation = evaluateToolActionRequest({
      tool: "repository.search",
      allowedTools: ["repository.read_file", "repository.search"],
      budget,
      budgetUsage: createAgentRunBudgetUsage({ actionsUsed: 3 }),
    });

    expect(evaluation.decision).toBe("budget_exhausted");
    expect(evaluation.ruleIds).toContain("platform.tool.budget.actions");
  });

  it("tracks budget consumption after an authorized action", () => {
    const nextUsage = applyBudgetConsumption(createAgentRunBudgetUsage(), 0.02, 800);

    expect(nextUsage.actionsUsed).toBe(1);
    expect(nextUsage.costUsdUsed).toBe(0.02);
    expect(nextUsage.tokensUsed).toBe(800);
  });
});
