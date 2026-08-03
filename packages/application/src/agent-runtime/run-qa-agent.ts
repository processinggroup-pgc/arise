import {
  buildAcceptanceCriterionTestPlan,
  buildQaAgentInputContract,
  buildQaBranchName,
  completeAgentRun,
  createAgentRunBudgetUsage,
  createQaAgentOutput,
  createToolActionEnvelope,
  startAgentRun,
  type AgentRunInputContract,
  type ExecutionEvidence,
  type QaAgentOutput,
  type TenantContext,
} from "@arise/domain";
import type { SandboxPort, WorkspacePort } from "@arise/integration-sandbox";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import { executeTypedToolAction } from "../execution/execute-typed-tool-action.js";
import { captureExecutionEvidence } from "../execution/capture-execution-evidence.js";
import { provisionExecutionSession } from "../execution/provision-execution-session.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { ExecutionEvidenceStore } from "../execution/execution-evidence-store.js";
import { assertRepositoryLinkedToWorkItemProject } from "../agent-runtime/agent-run-scope.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import { createAgentRunForWorkItem } from "../agent-runtime/create-agent-run.js";
import type { ModelRegistryStore } from "../agent-runtime/model-registry-store.js";
import type { ToolCallStore } from "../agent-runtime/tool-call-store.js";

export interface RunQaAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  branch: string;
}

export interface RunQaAgentResult {
  output: QaAgentOutput;
  inputContract: AgentRunInputContract;
  capturedExecutionEvidence: ExecutionEvidence;
}

export async function runQaAgent(
  command: RunQaAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  toolCallStore: ToolCallStore,
  executionSessionStore: ExecutionSessionStore,
  executionEvidenceStore: ExecutionEvidenceStore,
  sandboxPort: SandboxPort,
  workspacePort: WorkspacePort,
  operationContext: IdentityOperationContext,
): Promise<RunQaAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  const inputContract = buildQaAgentInputContract(command.workItemId, []);
  const testPlan = buildAcceptanceCriterionTestPlan(workItem);
  const qaBranchName = buildQaBranchName(workItem);

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "qa",
      registeredModelId: command.registeredModelId,
      inputContract: {
        role: inputContract.role,
        outputSchemaRef: inputContract.outputSchemaRef,
        allowedTools: inputContract.allowedTools,
        budget: inputContract.budget,
        contextItems: inputContract.contextItems,
      },
    },
    workItemStore,
    modelRegistryStore,
    agentRunStore,
    operationContext,
  );

  const runningRun = startAgentRun(createdRun.run);
  await agentRunStore.saveAgentRun(runningRun);

  const session = await provisionExecutionSession(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      repositoryId: command.repositoryId,
      branch: command.branch,
    },
    workItemStore,
    repositoryStore,
    executionSessionStore,
    sandboxPort,
    operationContext,
  );

  workspacePort.seedWorkspace(session.sandboxSessionId, {}, command.branch);

  let budgetUsage = createAgentRunBudgetUsage();
  const toolCallEvidenceRefs: string[] = [];
  const diffs: Array<{ path: string; before: string; after: string }> = [];
  let commitId = "";

  const branchAction = await executeTypedToolAction(
    {
      tenantContext: command.tenantContext,
      envelope: createToolActionEnvelope(
        {
          tenantId: command.tenantContext.organizationId,
          workItemId: command.workItemId,
          agentRunId: runningRun.id,
          tool: "git.create_branch",
          arguments: { branchName: qaBranchName },
          purpose: "Create an isolated branch for QA test authoring",
          expectedEffect: "Sandbox workspace switches to the QA branch",
          riskClass: "yellow",
          idempotencyKey: `qa-branch-${workItem.id}`,
        },
        { actionId: operationContext.createId() },
      ),
      inputContract,
      budgetUsage,
      executionSessionId: session.id,
    },
    agentRunStore,
    toolCallStore,
    executionSessionStore,
    workspacePort,
    operationContext,
  );
  budgetUsage = branchAction.budgetUsage;
  if (branchAction.evidenceRef !== undefined) {
    toolCallEvidenceRefs.push(branchAction.evidenceRef);
  }

  for (const test of testPlan) {
    const writeAction = await executeTypedToolAction(
      {
        tenantContext: command.tenantContext,
        envelope: createToolActionEnvelope(
          {
            tenantId: command.tenantContext.organizationId,
            workItemId: command.workItemId,
            agentRunId: runningRun.id,
            tool: "repository.write_file",
            arguments: { path: test.path, content: test.content },
            purpose: `Author failing test for trace ${test.traceRef}`,
            expectedEffect: `Create acceptance test at ${test.path}`,
            riskClass: "green",
            idempotencyKey: `qa-write-${test.traceRef}`,
          },
          { actionId: operationContext.createId() },
        ),
        inputContract,
        budgetUsage,
        executionSessionId: session.id,
      },
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      workspacePort,
      operationContext,
    );
    budgetUsage = writeAction.budgetUsage;
    if (writeAction.evidenceRef !== undefined) {
      toolCallEvidenceRefs.push(writeAction.evidenceRef);
    }

    const diffAction = await executeTypedToolAction(
      {
        tenantContext: command.tenantContext,
        envelope: createToolActionEnvelope(
          {
            tenantId: command.tenantContext.organizationId,
            workItemId: command.workItemId,
            agentRunId: runningRun.id,
            tool: "repository.diff",
            arguments: { path: test.path },
            purpose: `Capture diff evidence for ${test.path}`,
            expectedEffect: "Return before and after file contents",
            riskClass: "green",
            idempotencyKey: `qa-diff-${test.traceRef}`,
          },
          { actionId: operationContext.createId() },
        ),
        inputContract,
        budgetUsage,
        executionSessionId: session.id,
      },
      agentRunStore,
      toolCallStore,
      executionSessionStore,
      workspacePort,
      operationContext,
    );
    budgetUsage = diffAction.budgetUsage;
    if (diffAction.evidenceRef !== undefined) {
      toolCallEvidenceRefs.push(diffAction.evidenceRef);
    }

    if (diffAction.toolResult?.tool === "repository.diff") {
      diffs.push(diffAction.toolResult.result);
    }
  }

  const commitAction = await executeTypedToolAction(
    {
      tenantContext: command.tenantContext,
      envelope: createToolActionEnvelope(
        {
          tenantId: command.tenantContext.organizationId,
          workItemId: command.workItemId,
          agentRunId: runningRun.id,
          tool: "git.commit",
          arguments: { message: `Add acceptance tests for ${workItem.title.trim()}` },
          purpose: "Commit independently authored QA tests",
          expectedEffect: "Create a sandbox commit with acceptance test evidence",
          riskClass: "yellow",
          idempotencyKey: `qa-commit-${workItem.id}`,
        },
        { actionId: operationContext.createId() },
      ),
      inputContract,
      budgetUsage,
      executionSessionId: session.id,
    },
    agentRunStore,
    toolCallStore,
    executionSessionStore,
    workspacePort,
    operationContext,
  );
  if (commitAction.toolResult?.tool === "git.commit") {
    commitId = commitAction.toolResult.result.commitId;
  }
  if (commitAction.evidenceRef !== undefined) {
    toolCallEvidenceRefs.push(commitAction.evidenceRef);
  }

  const output = createQaAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: runningRun.id,
      executionSessionId: session.id,
      generatedTests: testPlan.map((entry) => ({
        traceRef: entry.traceRef,
        criterionIndex: entry.criterionIndex,
        path: entry.path,
        given: entry.given,
        when: entry.when,
        then: entry.then,
      })),
      executionEvidence: {
        branchName: qaBranchName,
        commitId,
        changedPaths: testPlan.map((entry) => entry.path),
        toolCallEvidenceRefs,
        diffs,
      },
    },
    { generatedAt: operationContext.now() },
  );

  const capturedExecutionEvidence = await captureExecutionEvidence(
    {
      tenantContext: command.tenantContext,
      executionSessionId: session.id,
      agentRunId: runningRun.id,
      workItemId: command.workItemId,
      branchName: qaBranchName,
      commitId,
      changedPaths: output.executionEvidence.changedPaths,
      diffs: output.executionEvidence.diffs,
      toolCallEvidenceRefs: output.executionEvidence.toolCallEvidenceRefs,
    },
    executionSessionStore,
    agentRunStore,
    executionEvidenceStore,
    operationContext,
  );

  const completedRun = completeAgentRun(runningRun);
  await agentRunStore.saveAgentRun(completedRun);

  return {
    output,
    inputContract: createdRun.inputContract,
    capturedExecutionEvidence,
  };
}
