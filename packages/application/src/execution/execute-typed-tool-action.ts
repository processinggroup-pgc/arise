import {
  assertExecutionSessionAcceptsToolActions,
  buildToolActionEvidenceRef,
  completeToolCall,
  isRepositoryGitTool,
  parseRepositoryGitToolArguments,
  type AgentRunBudgetUsage,
  type AgentRunInputContract,
  type TenantContext,
  type ToolActionEnvelope,
  type ToolCall,
  type TypedRepositoryGitToolArgs,
  type TypedRepositoryGitToolResult,
} from "@arise/domain";
import { WorkspaceToolError, type WorkspacePort } from "@arise/integration-sandbox";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import {
  authorizeToolAction,
  ToolActionBlockedError,
  ToolBudgetExhaustedError,
  type AuthorizeToolActionResult,
} from "../agent-runtime/authorize-tool-action.js";
import type { ToolCallStore } from "../agent-runtime/tool-call-store.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import { ExecutionSessionScopeError } from "./provision-execution-session.js";
import type { ExecutionSessionStore } from "./execution-session-store.js";

export interface ExecuteTypedToolActionCommand {
  tenantContext: TenantContext;
  envelope: ToolActionEnvelope;
  inputContract: AgentRunInputContract;
  budgetUsage: AgentRunBudgetUsage;
  executionSessionId: string;
}

export interface ExecuteTypedToolActionResult {
  authorized: boolean;
  evaluationDecision: AuthorizeToolActionResult["evaluationDecision"];
  reasons: string[];
  ruleIds: string[];
  toolCall: ToolCall;
  idempotentReplay: boolean;
  budgetUsage: AgentRunBudgetUsage;
  toolResult?: TypedRepositoryGitToolResult;
  evidenceRef?: string;
}

export class TypedToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TypedToolExecutionError";
  }
}

async function executeRepositoryGitToolOnWorkspace(
  workspacePort: WorkspacePort,
  sandboxSessionId: string,
  parsed: TypedRepositoryGitToolArgs,
): Promise<TypedRepositoryGitToolResult> {
  switch (parsed.tool) {
    case "repository.read_file": {
      const result = await workspacePort.readFile({
        sandboxSessionId,
        path: parsed.arguments.path,
      });
      return { tool: parsed.tool, result };
    }
    case "repository.search": {
      const result = await workspacePort.search({
        sandboxSessionId,
        query: parsed.arguments.query,
      });
      return { tool: parsed.tool, result };
    }
    case "repository.write_file": {
      const result = await workspacePort.writeFile({
        sandboxSessionId,
        path: parsed.arguments.path,
        content: parsed.arguments.content,
      });
      return { tool: parsed.tool, result };
    }
    case "repository.diff": {
      const result = await workspacePort.diff({
        sandboxSessionId,
        path: parsed.arguments.path,
      });
      return { tool: parsed.tool, result };
    }
    case "git.create_branch": {
      const result = await workspacePort.createBranch({
        sandboxSessionId,
        branchName: parsed.arguments.branchName,
      });
      return { tool: parsed.tool, result };
    }
    case "git.commit": {
      const result = await workspacePort.commit({
        sandboxSessionId,
        message: parsed.arguments.message,
      });
      return { tool: parsed.tool, result };
    }
  }
}

export async function executeTypedToolAction(
  command: ExecuteTypedToolActionCommand,
  agentRunStore: AgentRunStore,
  toolCallStore: ToolCallStore,
  executionSessionStore: ExecutionSessionStore,
  workspacePort: WorkspacePort,
  operationContext: IdentityOperationContext,
): Promise<ExecuteTypedToolActionResult> {
  if (!isRepositoryGitTool(command.envelope.tool)) {
    throw new TypedToolExecutionError("Tool is not a typed repository or git tool");
  }

  const executionSession = await executionSessionStore.findExecutionSessionById(
    command.executionSessionId,
  );
  if (executionSession === undefined) {
    throw new ExecutionSessionScopeError("Execution session was not found");
  }

  if (executionSession.organizationId !== command.tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Execution session is outside the tenant scope");
  }

  if (executionSession.workItemId !== command.envelope.workItemId) {
    throw new ExecutionSessionScopeError("Execution session work item mismatch");
  }

  try {
    assertExecutionSessionAcceptsToolActions(executionSession);
  } catch (error) {
    if (error instanceof Error) {
      throw new ExecutionSessionScopeError(error.message);
    }

    throw error;
  }

  let authorization: AuthorizeToolActionResult;
  try {
    authorization = await authorizeToolAction(
      {
        tenantContext: command.tenantContext,
        envelope: command.envelope,
        inputContract: command.inputContract,
        budgetUsage: command.budgetUsage,
      },
      agentRunStore,
      toolCallStore,
      operationContext,
    );
  } catch (error) {
    if (error instanceof ToolActionBlockedError || error instanceof ToolBudgetExhaustedError) {
      throw error;
    }

    if (error instanceof AgentRunScopeError) {
      throw error;
    }

    throw error;
  }

  if (authorization.toolCall === undefined) {
    throw new TypedToolExecutionError("Authorized tool call was not created");
  }

  if (authorization.idempotentReplay) {
    return {
      authorized: authorization.authorized,
      evaluationDecision: authorization.evaluationDecision,
      reasons: authorization.reasons,
      ruleIds: authorization.ruleIds,
      toolCall: authorization.toolCall,
      idempotentReplay: true,
      budgetUsage: authorization.budgetUsage,
      ...(authorization.toolCall.evidenceRef.length > 0
        ? { evidenceRef: authorization.toolCall.evidenceRef }
        : {}),
    };
  }

  let parsedArguments: TypedRepositoryGitToolArgs;
  try {
    parsedArguments = parseRepositoryGitToolArguments(
      command.envelope.tool,
      command.envelope.arguments,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new TypedToolExecutionError(error.message);
    }

    throw error;
  }

  let toolResult: TypedRepositoryGitToolResult;
  try {
    toolResult = await executeRepositoryGitToolOnWorkspace(
      workspacePort,
      executionSession.sandboxSessionId,
      parsedArguments,
    );
  } catch (error) {
    if (error instanceof WorkspaceToolError) {
      throw new TypedToolExecutionError(error.message);
    }

    throw error;
  }

  const evidenceRef = buildToolActionEvidenceRef(executionSession.id, authorization.toolCall.id);
  const completedToolCall = completeToolCall(authorization.toolCall, evidenceRef);
  await toolCallStore.saveToolCall(completedToolCall);

  return {
    authorized: true,
    evaluationDecision: authorization.evaluationDecision,
    reasons: authorization.reasons,
    ruleIds: authorization.ruleIds,
    toolCall: completedToolCall,
    idempotentReplay: false,
    budgetUsage: authorization.budgetUsage,
    toolResult,
    evidenceRef,
  };
}
