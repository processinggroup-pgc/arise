import type { ModelProvider } from "./model-registry.js";

export const AGENT_TYPES = [
  "discovery",
  "architecture",
  "coding",
  "database",
  "qa",
  "security",
  "reviewer",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_RUN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export interface AgentRun {
  id: string;
  organizationId: string;
  workItemId: string;
  agentType: AgentType;
  registeredModelId: string;
  modelProvider: ModelProvider;
  modelName: string;
  modelVersion: string;
  status: AgentRunStatus;
  tokenUsage: number;
  costUsd: number;
  createdAt: Date;
}

export interface CreateAgentRunInput {
  organizationId: string;
  workItemId: string;
  agentType: string;
  registeredModelId: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string;
  status?: string;
  tokenUsage?: number;
  costUsd?: number;
}

export interface CreateAgentRunMetadata {
  id: string;
  createdAt: Date;
}

function assertAgentType(agentType: string): AgentType {
  if (!(AGENT_TYPES as readonly string[]).includes(agentType)) {
    throw new Error("Agent type is invalid");
  }

  return agentType as AgentType;
}

function assertAgentRunStatus(status: string): AgentRunStatus {
  if (!(AGENT_RUN_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Agent run status is invalid");
  }

  return status as AgentRunStatus;
}

function assertModelProvider(provider: string): ModelProvider {
  if (!["openai", "anthropic", "cursor"].includes(provider)) {
    throw new Error("Model provider is invalid");
  }

  return provider as ModelProvider;
}

export function createAgentRun(
  input: CreateAgentRunInput,
  metadata: CreateAgentRunMetadata,
): AgentRun {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();
  const registeredModelId = input.registeredModelId.trim();
  const modelName = input.modelName.trim();
  const modelVersion = input.modelVersion.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (workItemId.length === 0) {
    throw new Error("Work item identifier is required");
  }

  if (registeredModelId.length === 0) {
    throw new Error("Registered model identifier is required");
  }

  if (modelName.length === 0) {
    throw new Error("Model name is required");
  }

  if (modelVersion.length === 0) {
    throw new Error("Model version is required");
  }

  const tokenUsage = input.tokenUsage ?? 0;
  const costUsd = input.costUsd ?? 0;

  if (tokenUsage < 0) {
    throw new Error("Token usage cannot be negative");
  }

  if (costUsd < 0) {
    throw new Error("Cost cannot be negative");
  }

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    agentType: assertAgentType(input.agentType),
    registeredModelId,
    modelProvider: assertModelProvider(input.modelProvider),
    modelName,
    modelVersion,
    status: assertAgentRunStatus(input.status ?? "pending"),
    tokenUsage,
    costUsd,
    createdAt: metadata.createdAt,
  };
}

export function completeAgentRun(run: AgentRun): AgentRun {
  if (run.status !== "pending" && run.status !== "running") {
    throw new Error("Agent run cannot be completed");
  }

  return {
    ...run,
    status: "completed",
  };
}
