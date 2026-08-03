import {
  applyBudgetConsumption,
  assertAgentRunAcceptsToolActions,
  createAgentRunBudgetUsage,
  createToolCall,
  evaluateToolActionRequest,
  redactSecrets,
  resolvePlatformToolDefinition,
  type AgentRunBudgetUsage,
  type AgentRunInputContract,
  type TenantContext,
  type ToolActionEnvelope,
  type ToolCall,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunStore } from "./agent-run-store.js";
import type { ToolCallStore } from "./tool-call-store.js";

export interface AuthorizeToolActionCommand {
  tenantContext: TenantContext;
  envelope: ToolActionEnvelope;
  inputContract: AgentRunInputContract;
  budgetUsage: AgentRunBudgetUsage;
}

export interface AuthorizeToolActionResult {
  authorized: boolean;
  evaluationDecision: "allowed" | "blocked" | "budget_exhausted";
  reasons: string[];
  ruleIds: string[];
  toolCall?: ToolCall;
  idempotentReplay: boolean;
  budgetUsage: AgentRunBudgetUsage;
}

export class ToolActionBlockedError extends Error {
  constructor(
    message: string,
    readonly reasons: string[],
    readonly ruleIds: string[],
  ) {
    super(message);
    this.name = "ToolActionBlockedError";
  }
}

export class ToolBudgetExhaustedError extends Error {
  constructor(
    message: string,
    readonly reasons: string[],
    readonly ruleIds: string[],
  ) {
    super(message);
    this.name = "ToolBudgetExhaustedError";
  }
}

function redactToolArguments(argumentsValue: Record<string, unknown>): Record<string, unknown> {
  const serialized = redactSecrets(JSON.stringify(argumentsValue));
  return JSON.parse(serialized) as Record<string, unknown>;
}

function assertEnvelopeMatchesRun(
  envelope: ToolActionEnvelope,
  inputContract: AgentRunInputContract,
  tenantContext: TenantContext,
): void {
  if (envelope.tenantId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Tool action is outside the tenant scope");
  }

  if (envelope.workItemId !== inputContract.workItemId) {
    throw new AgentRunScopeError("Tool action work item mismatch");
  }
}

export async function authorizeToolAction(
  command: AuthorizeToolActionCommand,
  agentRunStore: AgentRunStore,
  toolCallStore: ToolCallStore,
  operationContext: IdentityOperationContext,
): Promise<AuthorizeToolActionResult> {
  assertEnvelopeMatchesRun(command.envelope, command.inputContract, command.tenantContext);

  if (command.envelope.agentRunId.trim().length === 0) {
    throw new AgentRunScopeError("Agent run identifier is required");
  }

  const agentRun = await agentRunStore.findAgentRunById(command.envelope.agentRunId);
  if (agentRun === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (agentRun.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  if (agentRun.workItemId !== command.envelope.workItemId) {
    throw new AgentRunScopeError("Agent run work item mismatch");
  }

  try {
    assertAgentRunAcceptsToolActions(agentRun);
  } catch (error) {
    if (error instanceof Error) {
      throw new ToolActionBlockedError(error.message, [error.message], ["platform.tool.run_status"]);
    }

    throw error;
  }

  const existing = await toolCallStore.findToolCallByIdempotencyKey(
    command.envelope.agentRunId,
    command.envelope.idempotencyKey,
  );

  if (existing !== undefined && existing.status === "completed") {
    return {
      authorized: existing.decision === "allowed",
      evaluationDecision: existing.decision,
      reasons: ["Tool action idempotency key already completed"],
      ruleIds: ["platform.tool.idempotency"],
      toolCall: existing,
      idempotentReplay: true,
      budgetUsage: command.budgetUsage,
    };
  }

  const definition = resolvePlatformToolDefinition(command.envelope.tool);
  const evaluation = evaluateToolActionRequest({
    tool: command.envelope.tool,
    allowedTools: command.inputContract.allowedTools,
    budget: command.inputContract.budget,
    budgetUsage: command.budgetUsage,
    estimatedCostUsd: definition.estimatedCostUsd,
    estimatedTokens: definition.estimatedTokens,
  });

  const status =
    evaluation.decision === "allowed"
      ? "authorized"
      : evaluation.decision === "budget_exhausted"
        ? "blocked"
        : "blocked";

  const toolCall = createToolCall(
    {
      organizationId: command.tenantContext.organizationId,
      agentRunId: command.envelope.agentRunId,
      toolName: command.envelope.tool,
      argumentsRedacted: redactToolArguments(command.envelope.arguments),
      idempotencyKey: command.envelope.idempotencyKey,
      decision: evaluation.decision,
      status,
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await toolCallStore.saveToolCall(toolCall);

  if (evaluation.decision === "blocked") {
    throw new ToolActionBlockedError("Tool action is blocked by the allowlist", evaluation.reasons, evaluation.ruleIds);
  }

  if (evaluation.decision === "budget_exhausted") {
    throw new ToolBudgetExhaustedError(
      "Tool action exceeds the agent run budget",
      evaluation.reasons,
      evaluation.ruleIds,
    );
  }

  const budgetUsage = applyBudgetConsumption(
    createAgentRunBudgetUsage(command.budgetUsage),
    definition.estimatedCostUsd,
    definition.estimatedTokens,
  );

  return {
    authorized: true,
    evaluationDecision: evaluation.decision,
    reasons: evaluation.reasons,
    ruleIds: evaluation.ruleIds,
    toolCall,
    idempotentReplay: false,
    budgetUsage,
  };
}
