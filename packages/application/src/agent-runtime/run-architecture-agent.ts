import {
  buildArchitectureAgentInputContract,
  buildArchitectureDecisionRecordDraft,
  buildArchitectureOptions,
  completeAgentRun,
  createArchitectureAgentOutput,
  selectPreferredArchitectureOption,
  type AgentRunInputContract,
  type ArchitectureAgentOutput,
  type DiscoveryAgentOutput,
  type RetrievedContextItem,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { RepositoryIndexStore } from "../repository-intelligence/repository-index-store.js";
import { retrieveRepositoryContext } from "../repository-intelligence/retrieve-repository-context.js";
import {
  assertRepositoryLinkedToWorkItemProject,
  toAgentRunContextItems,
} from "./agent-run-scope.js";
import { AgentRunScopeError } from "./create-agent-run.js";
import type { AgentRunStore } from "./agent-run-store.js";
import { createAgentRunForWorkItem } from "./create-agent-run.js";
import type { ModelRegistryStore } from "./model-registry-store.js";

export interface RunArchitectureAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  discoveryOutput: DiscoveryAgentOutput;
  seedFilePaths: string[];
  maxContextItems?: number;
}

export interface RunArchitectureAgentResult {
  output: ArchitectureAgentOutput;
  inputContract: AgentRunInputContract;
  contextItems: RetrievedContextItem[];
  containsPromptInjection: boolean;
}

function assertDiscoveryOutputMatchesWorkItem(
  discoveryOutput: DiscoveryAgentOutput,
  workItemId: string,
): void {
  if (discoveryOutput.workItemId !== workItemId) {
    throw new AgentRunScopeError("Discovery output does not match the work item");
  }
}

export async function runArchitectureAgent(
  command: RunArchitectureAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  contentPort: GitHubRepositoryContentPort,
  operationContext: IdentityOperationContext,
): Promise<RunArchitectureAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  assertDiscoveryOutputMatchesWorkItem(command.discoveryOutput, command.workItemId);

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

  const inputContract = buildArchitectureAgentInputContract(
    command.workItemId,
    toAgentRunContextItems(contextResult.items),
  );

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "architecture",
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

  const options = buildArchitectureOptions({
    workItem,
    discoveryOutput: command.discoveryOutput,
    createId: () => operationContext.createId(),
  });
  const preferredOption = selectPreferredArchitectureOption(options, workItem);
  const decisionRecord = buildArchitectureDecisionRecordDraft({
    workItem,
    preferredOption,
    discoveryOutput: command.discoveryOutput,
  });

  const output = createArchitectureAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: createdRun.run.id,
      discoveryRunId: command.discoveryOutput.agentRunId,
      options,
      preferredOptionId: preferredOption.id,
      decisionRecord,
    },
    { generatedAt: operationContext.now() },
  );

  const completedRun = completeAgentRun(createdRun.run);
  await agentRunStore.saveAgentRun(completedRun);

  return {
    output,
    inputContract: createdRun.inputContract,
    contextItems: contextResult.items,
    containsPromptInjection: contextResult.containsPromptInjection,
  };
}

export { assertDiscoveryOutputMatchesWorkItem };
