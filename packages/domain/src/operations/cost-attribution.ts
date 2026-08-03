import type { AgentRun } from "../agent-runtime/agent-run.js";
import type { ToolCall } from "../agent-runtime/tool-call.js";
import { resolvePlatformToolDefinition } from "../agent-runtime/tool-enforcement.js";
import type { ExecutionSession } from "../execution/execution-session.js";

export const COST_ATTRIBUTION_CATEGORIES = ["model", "build", "sandbox"] as const;
export type CostAttributionCategory = (typeof COST_ATTRIBUTION_CATEGORIES)[number];

export const COST_ATTRIBUTION_SOURCE_TYPES = [
  "agent_run",
  "tool_call",
  "execution_session",
] as const;
export type CostAttributionSourceType = (typeof COST_ATTRIBUTION_SOURCE_TYPES)[number];

export const PLATFORM_SANDBOX_COST_RATE_USD_PER_MINUTE = 0.05;
export const PLATFORM_SANDBOX_MINIMUM_BILLABLE_MINUTES = 1;

export interface CostAttributionLineItem {
  category: CostAttributionCategory;
  sourceType: CostAttributionSourceType;
  sourceId: string;
  label: string;
  costUsd: number;
  tokens?: number;
  durationMs?: number;
}

export interface CostAttributionRecord {
  id: string;
  organizationId: string;
  workItemId: string;
  totalCostUsd: number;
  modelCostUsd: number;
  buildCostUsd: number;
  sandboxCostUsd: number;
  lineItems: CostAttributionLineItem[];
  attributedAt: Date;
}

export interface CreateCostAttributionRecordInput {
  organizationId: string;
  workItemId: string;
  totalCostUsd: number;
  modelCostUsd: number;
  buildCostUsd: number;
  sandboxCostUsd: number;
  lineItems: CostAttributionLineItem[];
}

export interface CreateCostAttributionRecordMetadata {
  id: string;
  attributedAt: Date;
}

export interface AggregateCostAttributionInput {
  organizationId: string;
  workItemId: string;
  lineItems: CostAttributionLineItem[];
}

const BUILD_ATTRIBUTION_TOOLS = ["build.run", "test.run"] as const;

function roundCostUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertCostAttributionCategory(category: string): CostAttributionCategory {
  if (!(COST_ATTRIBUTION_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Cost attribution category is invalid");
  }

  return category as CostAttributionCategory;
}

function assertCostAttributionSourceType(sourceType: string): CostAttributionSourceType {
  if (!(COST_ATTRIBUTION_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    throw new Error("Cost attribution source type is invalid");
  }

  return sourceType as CostAttributionSourceType;
}

function assertNonNegativeCost(costUsd: number, label: string): number {
  if (costUsd < 0) {
    throw new Error(`${label} cannot be negative`);
  }

  return roundCostUsd(costUsd);
}

function normalizeLineItem(lineItem: CostAttributionLineItem): CostAttributionLineItem {
  const normalized: CostAttributionLineItem = {
    category: assertCostAttributionCategory(lineItem.category),
    sourceType: assertCostAttributionSourceType(lineItem.sourceType),
    sourceId: lineItem.sourceId.trim(),
    label: lineItem.label.trim(),
    costUsd: assertNonNegativeCost(lineItem.costUsd, "Cost attribution line item cost"),
  };

  if (lineItem.tokens !== undefined) {
    if (lineItem.tokens < 0) {
      throw new Error("Cost attribution token count cannot be negative");
    }

    normalized.tokens = lineItem.tokens;
  }

  if (lineItem.durationMs !== undefined) {
    if (lineItem.durationMs < 0) {
      throw new Error("Cost attribution duration cannot be negative");
    }

    normalized.durationMs = lineItem.durationMs;
  }

  if (normalized.sourceId.length === 0 || normalized.label.length === 0) {
    throw new Error("Cost attribution line item identifiers are required");
  }

  return normalized;
}

export function attributeModelCostFromAgentRun(run: AgentRun): CostAttributionLineItem | null {
  if (run.costUsd <= 0) {
    return null;
  }

  return {
    category: "model",
    sourceType: "agent_run",
    sourceId: run.id,
    label: `${run.agentType} run (${run.modelName})`,
    costUsd: roundCostUsd(run.costUsd),
    tokens: run.tokenUsage,
  };
}

export function attributeBuildCostFromToolCall(toolCall: ToolCall): CostAttributionLineItem | null {
  if (toolCall.status !== "completed") {
    return null;
  }

  if (!(BUILD_ATTRIBUTION_TOOLS as readonly string[]).includes(toolCall.toolName)) {
    return null;
  }

  const definition = resolvePlatformToolDefinition(toolCall.toolName);

  return {
    category: "build",
    sourceType: "tool_call",
    sourceId: toolCall.id,
    label: toolCall.toolName,
    costUsd: roundCostUsd(definition.estimatedCostUsd),
  };
}

export function attributeSandboxCostFromExecutionSession(
  session: ExecutionSession,
  asOf: Date,
): CostAttributionLineItem | null {
  if (session.state === "requested" && session.sandboxSessionId.trim().length === 0) {
    return null;
  }

  const endedAt = session.endedAt ?? asOf;
  const durationMs = Math.max(0, endedAt.getTime() - session.startedAt.getTime());
  const billableMinutes = Math.max(
    PLATFORM_SANDBOX_MINIMUM_BILLABLE_MINUTES,
    Math.ceil(durationMs / 60_000),
  );
  const costUsd = roundCostUsd(billableMinutes * PLATFORM_SANDBOX_COST_RATE_USD_PER_MINUTE);

  return {
    category: "sandbox",
    sourceType: "execution_session",
    sourceId: session.id,
    label: `Sandbox session (${session.sandboxProvider})`,
    costUsd,
    durationMs,
  };
}

export function aggregateCostAttribution(
  input: AggregateCostAttributionInput,
): Omit<CostAttributionRecord, "id" | "attributedAt"> {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Cost attribution identifiers are required");
  }

  const lineItems = input.lineItems.map(normalizeLineItem);
  const modelCostUsd = roundCostUsd(
    lineItems
      .filter((item) => item.category === "model")
      .reduce((sum, item) => sum + item.costUsd, 0),
  );
  const buildCostUsd = roundCostUsd(
    lineItems
      .filter((item) => item.category === "build")
      .reduce((sum, item) => sum + item.costUsd, 0),
  );
  const sandboxCostUsd = roundCostUsd(
    lineItems
      .filter((item) => item.category === "sandbox")
      .reduce((sum, item) => sum + item.costUsd, 0),
  );

  return {
    organizationId,
    workItemId,
    totalCostUsd: roundCostUsd(modelCostUsd + buildCostUsd + sandboxCostUsd),
    modelCostUsd,
    buildCostUsd,
    sandboxCostUsd,
    lineItems,
  };
}

export function createCostAttributionRecord(
  input: CreateCostAttributionRecordInput,
  metadata: CreateCostAttributionRecordMetadata,
): CostAttributionRecord {
  const aggregated = aggregateCostAttribution({
    organizationId: input.organizationId,
    workItemId: input.workItemId,
    lineItems: input.lineItems,
  });

  if (aggregated.totalCostUsd !== roundCostUsd(input.totalCostUsd)) {
    throw new Error("Cost attribution totals are inconsistent");
  }

  if (
    aggregated.modelCostUsd !== roundCostUsd(input.modelCostUsd) ||
    aggregated.buildCostUsd !== roundCostUsd(input.buildCostUsd) ||
    aggregated.sandboxCostUsd !== roundCostUsd(input.sandboxCostUsd)
  ) {
    throw new Error("Cost attribution category totals are inconsistent");
  }

  return {
    id: metadata.id,
    ...aggregated,
    attributedAt: metadata.attributedAt,
  };
}
