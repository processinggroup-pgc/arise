import {
  buildCodingAgentInputContract,
  buildCodingTaskFromArchitecture,
  buildCodingTaskImplementationPlan,
  completeAgentRun,
  createAgentRunBudgetUsage,
  createCodingAgentOutput,
  createToolActionEnvelope,
  startAgentRun,
  type AgentRunInputContract,
  type ArchitectureAgentOutput,
  type CodingAgentOutput,
  type CodingTask,
  type ExecutionEvidence,
  type RetrievedContextItem,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";
import type { SandboxPort, WorkspacePort } from "@arise/integration-sandbox";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { RepositoryIndexStore } from "../repository-intelligence/repository-index-store.js";
import { retrieveRepositoryContext } from "../repository-intelligence/retrieve-repository-context.js";
import { executeTypedToolAction } from "../execution/execute-typed-tool-action.js";
import { captureExecutionEvidence } from "../execution/capture-execution-evidence.js";
import { provisionExecutionSession } from "../execution/provision-execution-session.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { ExecutionEvidenceStore } from "../execution/execution-evidence-store.js";
import {
  assertRepositoryLinkedToWorkItemProject,
  toAgentRunContextItems,
} from "../agent-runtime/agent-run-scope.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import { createAgentRunForWorkItem } from "../agent-runtime/create-agent-run.js";
import type { ModelRegistryStore } from "../agent-runtime/model-registry-store.js";
import type { ToolCallStore } from "../agent-runtime/tool-call-store.js";

export interface RunCodingAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  architectureOutput: ArchitectureAgentOutput;
  branch: string;
  task?: CodingTask;
  seedFilePaths: string[];
  maxContextItems?: number;
}

export interface RunCodingAgentResult {
  output: CodingAgentOutput;
  inputContract: AgentRunInputContract;
  contextItems: RetrievedContextItem[];
  containsPromptInjection: boolean;
  capturedExecutionEvidence: ExecutionEvidence;
}

function assertArchitectureOutputMatchesWorkItem(
  architectureOutput: ArchitectureAgentOutput,
  workItemId: string,
): void {
  if (architectureOutput.workItemId !== workItemId) {
    throw new AgentRunScopeError("Architecture output does not match the work item");
  }
}

async function loadRepositoryFilesForPaths(
  repositoryStore: RepositoryStore,
  repositoryId: string,
  contentPort: GitHubRepositoryContentPort,
  paths: string[],
): Promise<Record<string, string>> {
  const repository = await repositoryStore.findRepositoryById(repositoryId);
  if (repository === undefined) {
    throw new AgentRunScopeError("Repository was not found");
  }

  const allFiles = await contentPort.listRepositoryFiles({
    installationId: repository.installationId,
    owner: repository.fullName.split("/")[0] ?? "",
    name: repository.fullName.split("/")[1] ?? "",
  });

  const files: Record<string, string> = {};
  for (const file of allFiles) {
    if (paths.includes(file.path)) {
      files[file.path] = file.content;
    }
  }

  return files;
}

export async function runCodingAgent(
  command: RunCodingAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  toolCallStore: ToolCallStore,
  executionSessionStore: ExecutionSessionStore,
  executionEvidenceStore: ExecutionEvidenceStore,
  sandboxPort: SandboxPort,
  workspacePort: WorkspacePort,
  contentPort: GitHubRepositoryContentPort,
  operationContext: IdentityOperationContext,
): Promise<RunCodingAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  assertArchitectureOutputMatchesWorkItem(command.architectureOutput, command.workItemId);

  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  const contextResult = await retrieveRepositoryContext(
    {
      tenantContext: command.tenantContext,
      repositoryId: command.repositoryId,
      seedFilePaths: command.seedFilePaths,
      ...(command.maxContextItems === undefined ? {} : { maxContextItems: command.maxContextItems }),
    },
    repositoryStore,
    repositoryIndexStore,
    contentPort,
    operationContext,
  );

  const inputContract = buildCodingAgentInputContract(
    command.workItemId,
    toAgentRunContextItems(contextResult.items),
  );

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "coding",
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

  const task =
    command.task ??
    buildCodingTaskFromArchitecture({
      workItem,
      architectureOutput: command.architectureOutput,
      createId: () => operationContext.createId(),
    });

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

  const existingFiles = await loadRepositoryFilesForPaths(
    repositoryStore,
    command.repositoryId,
    contentPort,
    task.targetPaths,
  );

  workspacePort.seedWorkspace(session.sandboxSessionId, existingFiles, command.branch);

  const plan = buildCodingTaskImplementationPlan(task, workItem, existingFiles);
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
          arguments: { branchName: task.branchName },
          purpose: "Create an isolated branch for the coding task",
          expectedEffect: "Sandbox workspace switches to the task branch",
          riskClass: "yellow",
          idempotencyKey: `branch-${task.id}`,
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

  for (const change of plan) {
    const writeAction = await executeTypedToolAction(
      {
        tenantContext: command.tenantContext,
        envelope: createToolActionEnvelope(
          {
            tenantId: command.tenantContext.organizationId,
            workItemId: command.workItemId,
            agentRunId: runningRun.id,
            tool: "repository.write_file",
            arguments: { path: change.path, content: change.content },
            purpose: `Apply ${change.phase} change for ${task.title}`,
            expectedEffect: `Update ${change.path}`,
            riskClass: change.phase === "test" ? "green" : "yellow",
            idempotencyKey: `write-${task.id}-${change.path}`,
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
            arguments: { path: change.path },
            purpose: `Capture diff evidence for ${change.path}`,
            expectedEffect: "Return before and after file contents",
            riskClass: "green",
            idempotencyKey: `diff-${task.id}-${change.path}`,
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
          arguments: { message: task.title },
          purpose: "Commit the coding task changes",
          expectedEffect: "Create a sandbox commit with task evidence",
          riskClass: "yellow",
          idempotencyKey: `commit-${task.id}`,
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

  const output = createCodingAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: runningRun.id,
      architectureRunId: command.architectureOutput.agentRunId,
      executionSessionId: session.id,
      task,
      executionEvidence: {
        branchName: task.branchName,
        commitId,
        changedPaths: plan.map((change) => change.path),
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
      branchName: task.branchName,
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
    contextItems: contextResult.items,
    containsPromptInjection: contextResult.containsPromptInjection,
    capturedExecutionEvidence,
  };
}

export { assertArchitectureOutputMatchesWorkItem };
