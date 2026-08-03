import type { AgentToolName, ToolRiskClass } from "./agent-run-contracts.js";
import type { AgentRunBudget } from "./agent-run-contracts.js";

export const TOOL_ACTION_DECISIONS = ["allowed", "blocked", "budget_exhausted"] as const;
export type ToolActionDecision = (typeof TOOL_ACTION_DECISIONS)[number];

export interface PlatformToolDefinition {
  tool: AgentToolName;
  defaultRiskClass: ToolRiskClass;
  estimatedCostUsd: number;
  estimatedTokens: number;
}

export const PLATFORM_TOOL_REGISTRY: PlatformToolDefinition[] = [
  {
    tool: "repository.read_file",
    defaultRiskClass: "green",
    estimatedCostUsd: 0.01,
    estimatedTokens: 500,
  },
  {
    tool: "repository.search",
    defaultRiskClass: "green",
    estimatedCostUsd: 0.02,
    estimatedTokens: 800,
  },
  {
    tool: "repository.write_file",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.05,
    estimatedTokens: 1_200,
  },
  {
    tool: "repository.diff",
    defaultRiskClass: "green",
    estimatedCostUsd: 0.02,
    estimatedTokens: 600,
  },
  {
    tool: "git.create_branch",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.03,
    estimatedTokens: 400,
  },
  {
    tool: "git.commit",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.04,
    estimatedTokens: 700,
  },
  {
    tool: "test.run",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.1,
    estimatedTokens: 2_000,
  },
  {
    tool: "build.run",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.15,
    estimatedTokens: 2_500,
  },
  {
    tool: "migration.validate",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.08,
    estimatedTokens: 1_500,
  },
  {
    tool: "github.open_pull_request",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.05,
    estimatedTokens: 900,
  },
  {
    tool: "github.read_checks",
    defaultRiskClass: "green",
    estimatedCostUsd: 0.02,
    estimatedTokens: 500,
  },
  {
    tool: "vercel.create_preview",
    defaultRiskClass: "red",
    estimatedCostUsd: 0.2,
    estimatedTokens: 1_000,
  },
  {
    tool: "vercel.read_deployment",
    defaultRiskClass: "green",
    estimatedCostUsd: 0.02,
    estimatedTokens: 500,
  },
  {
    tool: "supabase.create_preview_branch",
    defaultRiskClass: "red",
    estimatedCostUsd: 0.25,
    estimatedTokens: 1_200,
  },
  {
    tool: "supabase.validate_schema",
    defaultRiskClass: "yellow",
    estimatedCostUsd: 0.08,
    estimatedTokens: 1_500,
  },
];

export interface AgentRunBudgetUsage {
  actionsUsed: number;
  costUsdUsed: number;
  tokensUsed: number;
}

export interface ToolActionEvaluation {
  decision: ToolActionDecision;
  reasons: string[];
  ruleIds: string[];
}

export interface EvaluateToolActionInput {
  tool: AgentToolName;
  allowedTools: AgentToolName[];
  budget: AgentRunBudget;
  budgetUsage: AgentRunBudgetUsage;
  estimatedCostUsd?: number;
  estimatedTokens?: number;
}

export function createAgentRunBudgetUsage(
  usage: Partial<AgentRunBudgetUsage> = {},
): AgentRunBudgetUsage {
  const actionsUsed = usage.actionsUsed ?? 0;
  const costUsdUsed = usage.costUsdUsed ?? 0;
  const tokensUsed = usage.tokensUsed ?? 0;

  if (actionsUsed < 0 || costUsdUsed < 0 || tokensUsed < 0) {
    throw new Error("Agent run budget usage cannot be negative");
  }

  return {
    actionsUsed,
    costUsdUsed,
    tokensUsed,
  };
}

export function resolvePlatformToolDefinition(tool: AgentToolName): PlatformToolDefinition {
  const definition = PLATFORM_TOOL_REGISTRY.find((entry) => entry.tool === tool);
  if (definition === undefined) {
    throw new Error("Platform tool definition was not found");
  }

  return definition;
}

export function evaluateToolActionRequest(input: EvaluateToolActionInput): ToolActionEvaluation {
  if (!(input.allowedTools as readonly string[]).includes(input.tool)) {
    return {
      decision: "blocked",
      reasons: [`Tool ${input.tool} is not in the agent run allowlist`],
      ruleIds: ["platform.tool.allowlist"],
    };
  }

  const definition = resolvePlatformToolDefinition(input.tool);
  const estimatedCostUsd = input.estimatedCostUsd ?? definition.estimatedCostUsd;
  const estimatedTokens = input.estimatedTokens ?? definition.estimatedTokens;

  if (input.budgetUsage.actionsUsed >= input.budget.maxActions) {
    return {
      decision: "budget_exhausted",
      reasons: ["Agent run action budget is exhausted"],
      ruleIds: ["platform.tool.budget.actions"],
    };
  }

  if (input.budgetUsage.costUsdUsed + estimatedCostUsd > input.budget.maxCostUsd) {
    return {
      decision: "budget_exhausted",
      reasons: ["Agent run cost budget is exhausted"],
      ruleIds: ["platform.tool.budget.cost"],
    };
  }

  if (input.budgetUsage.tokensUsed + estimatedTokens > input.budget.maxTokens) {
    return {
      decision: "budget_exhausted",
      reasons: ["Agent run token budget is exhausted"],
      ruleIds: ["platform.tool.budget.tokens"],
    };
  }

  return {
    decision: "allowed",
    reasons: [`Tool ${input.tool} is authorized for this agent run`],
    ruleIds: ["platform.tool.allowlist", "platform.tool.budget"],
  };
}

export function applyBudgetConsumption(
  usage: AgentRunBudgetUsage,
  estimatedCostUsd: number,
  estimatedTokens: number,
): AgentRunBudgetUsage {
  if (estimatedCostUsd < 0 || estimatedTokens < 0) {
    throw new Error("Budget consumption estimates cannot be negative");
  }

  return {
    actionsUsed: usage.actionsUsed + 1,
    costUsdUsed: usage.costUsdUsed + estimatedCostUsd,
    tokensUsed: usage.tokensUsed + estimatedTokens,
  };
}
