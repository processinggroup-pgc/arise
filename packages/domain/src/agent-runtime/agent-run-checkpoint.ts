import type { AgentRunBudgetUsage } from "./tool-enforcement.js";
import { createAgentRunBudgetUsage } from "./tool-enforcement.js";

export interface AgentRunCheckpoint {
  id: string;
  organizationId: string;
  agentRunId: string;
  phase: string;
  budgetUsage: AgentRunBudgetUsage;
  completedSteps: string[];
  createdAt: Date;
}

export interface CreateAgentRunCheckpointInput {
  organizationId: string;
  agentRunId: string;
  phase: string;
  budgetUsage: AgentRunBudgetUsage;
  completedSteps: string[];
}

export interface CreateAgentRunCheckpointMetadata {
  id: string;
  createdAt: Date;
}

export function createAgentRunCheckpoint(
  input: CreateAgentRunCheckpointInput,
  metadata: CreateAgentRunCheckpointMetadata,
): AgentRunCheckpoint {
  const organizationId = input.organizationId.trim();
  const agentRunId = input.agentRunId.trim();
  const phase = input.phase.trim();
  const completedSteps = input.completedSteps
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  if (organizationId.length === 0 || agentRunId.length === 0) {
    throw new Error("Agent run checkpoint identifiers are required");
  }

  if (phase.length === 0) {
    throw new Error("Agent run checkpoint phase is required");
  }

  return {
    id: metadata.id,
    organizationId,
    agentRunId,
    phase,
    budgetUsage: createAgentRunBudgetUsage(input.budgetUsage),
    completedSteps,
    createdAt: metadata.createdAt,
  };
}
