import {
  buildDiscoveryAgentInputContract,
  buildDiscoveryAssessmentEvidence,
  buildDiscoveryRepositoryMap,
  completeAgentRun,
  createDiscoveryAgentOutput,
  type AgentRunInputContract,
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
import type { AgentRunStore } from "./agent-run-store.js";
import { createAgentRunForWorkItem } from "./create-agent-run.js";
import type { ModelRegistryStore } from "./model-registry-store.js";

export interface RunDiscoveryAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  seedFilePaths: string[];
  maxContextItems?: number;
}

export interface RunDiscoveryAgentResult {
  output: DiscoveryAgentOutput;
  inputContract: AgentRunInputContract;
  contextItems: RetrievedContextItem[];
  containsPromptInjection: boolean;
}

export async function runDiscoveryAgent(
  command: RunDiscoveryAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  contentPort: GitHubRepositoryContentPort,
  operationContext: IdentityOperationContext,
): Promise<RunDiscoveryAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const contextResult = await retrieveRepositoryContext(
    {
      tenantContext: command.tenantContext,
      repositoryId: command.repositoryId,
      seedFilePaths: command.seedFilePaths,
      ...(command.maxContextItems === undefined
        ? {}
        : { maxContextItems: command.maxContextItems }),
    },
    repositoryStore,
    repositoryIndexStore,
    contentPort,
    operationContext,
  );

  const inputContract = buildDiscoveryAgentInputContract(
    command.workItemId,
    toAgentRunContextItems(contextResult.items),
  );

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "discovery",
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

  const files = await repositoryIndexStore.listFilesForRepository(command.repositoryId);
  const symbols = await repositoryIndexStore.listSymbolsForRepository(command.repositoryId);
  const dependencies = await repositoryIndexStore.listDependenciesForRepository(
    command.repositoryId,
  );
  const testMaps = await repositoryIndexStore.listTestMapsForRepository(command.repositoryId);

  const repositoryMap = buildDiscoveryRepositoryMap({
    repositoryId: command.repositoryId,
    files,
    symbols,
    dependencies,
    testMaps,
  });

  const assessmentEvidence = buildDiscoveryAssessmentEvidence({
    repositoryMap,
    contextItemCount: contextResult.items.length,
    containsPromptInjection: contextResult.containsPromptInjection,
    seedFilePaths: command.seedFilePaths,
    injectionPatternIds: contextResult.injectionFindings.map((finding) => finding.patternId),
  });

  const output = createDiscoveryAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: createdRun.run.id,
      repositoryMap,
      assessmentEvidence,
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
