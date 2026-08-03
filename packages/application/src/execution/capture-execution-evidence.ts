import {
  buildExecutionEvidenceInput,
  createExecutionEvidence,
  type ExecutionDiff,
  type ExecutionEvidence,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import { ExecutionSessionScopeError } from "./provision-execution-session.js";
import type { ExecutionSessionStore } from "./execution-session-store.js";
import type { ExecutionEvidenceStore } from "./execution-evidence-store.js";

export interface CaptureExecutionEvidenceCommand {
  tenantContext: TenantContext;
  executionSessionId: string;
  agentRunId: string;
  workItemId: string;
  branchName: string;
  commitId: string;
  changedPaths: string[];
  diffs: ExecutionDiff[];
  toolCallEvidenceRefs: string[];
}

export async function captureExecutionEvidence(
  command: CaptureExecutionEvidenceCommand,
  executionSessionStore: ExecutionSessionStore,
  agentRunStore: AgentRunStore,
  executionEvidenceStore: ExecutionEvidenceStore,
  operationContext: IdentityOperationContext,
): Promise<ExecutionEvidence> {
  const session = await executionSessionStore.findExecutionSessionById(command.executionSessionId);
  if (session === undefined) {
    throw new ExecutionSessionScopeError("Execution session was not found");
  }

  if (session.organizationId !== command.tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Execution session is outside the tenant scope");
  }

  if (session.workItemId !== command.workItemId) {
    throw new ExecutionSessionScopeError("Execution session work item mismatch");
  }

  const agentRun = await agentRunStore.findAgentRunById(command.agentRunId);
  if (agentRun === undefined) {
    throw new AgentRunScopeError("Agent run was not found");
  }

  if (agentRun.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Agent run is outside the tenant scope");
  }

  if (agentRun.workItemId !== command.workItemId) {
    throw new AgentRunScopeError("Agent run work item mismatch");
  }

  const evidence = createExecutionEvidence(
    buildExecutionEvidenceInput({
      organizationId: command.tenantContext.organizationId,
      executionSessionId: command.executionSessionId,
      agentRunId: command.agentRunId,
      workItemId: command.workItemId,
      branchName: command.branchName,
      commitId: command.commitId,
      changedPaths: command.changedPaths,
      diffs: command.diffs,
      toolCallEvidenceRefs: command.toolCallEvidenceRefs,
    }),
    {
      id: operationContext.createId(),
      capturedAt: operationContext.now(),
    },
  );

  await executionEvidenceStore.saveExecutionEvidence(evidence);

  return evidence;
}
