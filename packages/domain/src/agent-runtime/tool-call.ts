import type { AgentToolName } from "./agent-run-contracts.js";
import type { ToolActionDecision } from "./tool-enforcement.js";

export const TOOL_CALL_STATUSES = ["authorized", "completed", "failed", "blocked"] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

export interface ToolCall {
  id: string;
  organizationId: string;
  agentRunId: string;
  toolName: AgentToolName;
  argumentsRedacted: Record<string, unknown>;
  idempotencyKey: string;
  decision: ToolActionDecision;
  status: ToolCallStatus;
  evidenceRef: string;
  createdAt: Date;
}

export interface CreateToolCallInput {
  organizationId: string;
  agentRunId: string;
  toolName: string;
  argumentsRedacted: Record<string, unknown>;
  idempotencyKey: string;
  decision: string;
  status: string;
  evidenceRef?: string;
}

export interface CreateToolCallMetadata {
  id: string;
  createdAt: Date;
}

function assertToolCallStatus(status: string): ToolCallStatus {
  if (!(TOOL_CALL_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Tool call status is invalid");
  }

  return status as ToolCallStatus;
}

function assertToolActionDecision(decision: string): ToolActionDecision {
  if (!(["allowed", "blocked", "budget_exhausted"] as readonly string[]).includes(decision)) {
    throw new Error("Tool action decision is invalid");
  }

  return decision as ToolActionDecision;
}

function assertAgentToolName(tool: string): AgentToolName {
  const toolNames = [
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

  if (!(toolNames as readonly string[]).includes(tool)) {
    throw new Error("Agent tool name is invalid");
  }

  return tool as AgentToolName;
}

export function createToolCall(
  input: CreateToolCallInput,
  metadata: CreateToolCallMetadata,
): ToolCall {
  const organizationId = input.organizationId.trim();
  const agentRunId = input.agentRunId.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  const evidenceRef = input.evidenceRef?.trim() ?? "";

  if (organizationId.length === 0 || agentRunId.length === 0 || idempotencyKey.length === 0) {
    throw new Error("Tool call identifiers are required");
  }

  return {
    id: metadata.id,
    organizationId,
    agentRunId,
    toolName: assertAgentToolName(input.toolName.trim()),
    argumentsRedacted: input.argumentsRedacted,
    idempotencyKey,
    decision: assertToolActionDecision(input.decision.trim()),
    status: assertToolCallStatus(input.status.trim()),
    evidenceRef,
    createdAt: metadata.createdAt,
  };
}

export function completeToolCall(toolCall: ToolCall, evidenceRef: string): ToolCall {
  if (toolCall.status !== "authorized") {
    throw new Error("Only authorized tool calls can be completed");
  }

  const normalizedEvidenceRef = evidenceRef.trim();
  if (normalizedEvidenceRef.length === 0) {
    throw new Error("Tool call evidence reference is required");
  }

  return {
    ...toolCall,
    status: "completed",
    evidenceRef: normalizedEvidenceRef,
  };
}
