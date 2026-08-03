import { assertRepositoryContextTrustIsNotElevated } from "../repository-intelligence/prompt-injection-detection.js";

export const AGENT_TOOL_NAMES = [
  "repository.read_file",
  "repository.search",
  "repository.write_file",
  "repository.diff",
  "git.create_branch",
  "git.commit",
  "test.run",
  "build.run",
  "migration.validate",
  "github.open_pull_request",
  "github.read_checks",
  "vercel.create_preview",
  "vercel.read_deployment",
  "supabase.create_preview_branch",
  "supabase.validate_schema",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export const TOOL_RISK_CLASSES = ["green", "yellow", "red"] as const;
export type ToolRiskClass = (typeof TOOL_RISK_CLASSES)[number];

export interface AgentRunBudget {
  maxActions: number;
  maxCostUsd: number;
  maxTokens: number;
}

export interface AgentRunContextItem {
  sourceType: string;
  sourceRef: string;
  trustLevel: string;
  contentHash: string;
  rank: number;
}

export interface AgentRunInputContract {
  role: string;
  workItemId: string;
  outputSchemaRef: string;
  allowedTools: AgentToolName[];
  budget: AgentRunBudget;
  contextItems: AgentRunContextItem[];
}

export interface CreateAgentRunInputContractInput {
  role: string;
  workItemId: string;
  outputSchemaRef: string;
  allowedTools: string[];
  budget: AgentRunBudget;
  contextItems: AgentRunContextItem[];
}

export interface ToolActionEnvelope {
  actionId: string;
  tenantId: string;
  workItemId: string;
  agentRunId: string;
  tool: AgentToolName;
  arguments: Record<string, unknown>;
  purpose: string;
  expectedEffect: string;
  riskClass: ToolRiskClass;
  idempotencyKey: string;
}

export interface CreateToolActionEnvelopeInput {
  tenantId: string;
  workItemId: string;
  agentRunId: string;
  tool: string;
  arguments?: Record<string, unknown>;
  purpose: string;
  expectedEffect: string;
  riskClass: string;
  idempotencyKey: string;
}

export interface CreateToolActionEnvelopeMetadata {
  actionId: string;
}

function assertAgentToolName(tool: string): AgentToolName {
  if (!(AGENT_TOOL_NAMES as readonly string[]).includes(tool)) {
    throw new Error("Agent tool name is invalid");
  }

  return tool as AgentToolName;
}

function assertToolRiskClass(riskClass: string): ToolRiskClass {
  if (!(TOOL_RISK_CLASSES as readonly string[]).includes(riskClass)) {
    throw new Error("Tool risk class is invalid");
  }

  return riskClass as ToolRiskClass;
}

function assertAgentRunBudget(budget: AgentRunBudget): AgentRunBudget {
  if (!Number.isInteger(budget.maxActions) || budget.maxActions < 1) {
    throw new Error("Agent run max actions must be a positive integer");
  }

  if (budget.maxCostUsd <= 0) {
    throw new Error("Agent run max cost must be positive");
  }

  if (!Number.isInteger(budget.maxTokens) || budget.maxTokens < 1) {
    throw new Error("Agent run max tokens must be a positive integer");
  }

  return budget;
}

function assertAgentRunContextItems(contextItems: AgentRunContextItem[]): AgentRunContextItem[] {
  const normalized = contextItems.map((item) => ({
    sourceType: item.sourceType.trim(),
    sourceRef: item.sourceRef.trim(),
    trustLevel: item.trustLevel.trim(),
    contentHash: item.contentHash.trim(),
    rank: item.rank,
  }));

  for (const item of normalized) {
    if (item.sourceType.length === 0 || item.sourceRef.length === 0) {
      throw new Error("Agent run context source is required");
    }

    if (item.contentHash.length === 0) {
      throw new Error("Agent run context content hash is required");
    }

    if (!Number.isInteger(item.rank) || item.rank < 1) {
      throw new Error("Agent run context rank must be a positive integer");
    }
  }

  assertRepositoryContextTrustIsNotElevated(normalized);

  return normalized;
}

export function createAgentRunInputContract(
  input: CreateAgentRunInputContractInput,
): AgentRunInputContract {
  const role = input.role.trim();
  const workItemId = input.workItemId.trim();
  const outputSchemaRef = input.outputSchemaRef.trim();

  if (role.length === 0) {
    throw new Error("Agent role is required");
  }

  if (workItemId.length === 0) {
    throw new Error("Work item identifier is required");
  }

  if (outputSchemaRef.length === 0) {
    throw new Error("Output schema reference is required");
  }

  const allowedTools = input.allowedTools.map((tool) => assertAgentToolName(tool.trim()));
  const uniqueTools = [...new Set(allowedTools)];

  if (uniqueTools.length === 0) {
    throw new Error("Allowed tools are required");
  }

  return {
    role,
    workItemId,
    outputSchemaRef,
    allowedTools: uniqueTools,
    budget: assertAgentRunBudget(input.budget),
    contextItems: assertAgentRunContextItems(input.contextItems),
  };
}

export function createToolActionEnvelope(
  input: CreateToolActionEnvelopeInput,
  metadata: CreateToolActionEnvelopeMetadata,
): ToolActionEnvelope {
  const tenantId = input.tenantId.trim();
  const workItemId = input.workItemId.trim();
  const agentRunId = input.agentRunId.trim();
  const purpose = input.purpose.trim();
  const expectedEffect = input.expectedEffect.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (
    tenantId.length === 0 ||
    workItemId.length === 0 ||
    agentRunId.length === 0 ||
    purpose.length === 0 ||
    expectedEffect.length === 0 ||
    idempotencyKey.length === 0
  ) {
    throw new Error("Tool action envelope fields are required");
  }

  return {
    actionId: metadata.actionId,
    tenantId,
    workItemId,
    agentRunId,
    tool: assertAgentToolName(input.tool.trim()),
    arguments: input.arguments ?? {},
    purpose,
    expectedEffect,
    riskClass: assertToolRiskClass(input.riskClass.trim()),
    idempotencyKey,
  };
}
