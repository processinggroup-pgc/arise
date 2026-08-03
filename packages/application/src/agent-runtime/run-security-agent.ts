import {
  buildSecurityAgentInputContract,
  buildSecurityReviewFindings,
  buildSecurityThreatModel,
  completeAgentRun,
  createSecurityAgentOutput,
  type AgentRunInputContract,
  type DiscoveryAgentOutput,
  type ExecutionEvidence,
  type RetrievedContextItem,
  type SecurityAgentOutput,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { RepositoryIndexStore } from "../repository-intelligence/repository-index-store.js";
import { retrieveRepositoryContext } from "../repository-intelligence/retrieve-repository-context.js";
import { raiseFinding } from "../verification/raise-finding.js";
import type { FindingStore } from "../verification/finding-store.js";
import {
  assertRepositoryLinkedToWorkItemProject,
  toAgentRunContextItems,
} from "../agent-runtime/agent-run-scope.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { AgentRunStore } from "../agent-runtime/agent-run-store.js";
import { createAgentRunForWorkItem } from "../agent-runtime/create-agent-run.js";
import type { ModelRegistryStore } from "../agent-runtime/model-registry-store.js";

export interface RunSecurityAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  discoveryOutput: DiscoveryAgentOutput;
  executionEvidence: ExecutionEvidence;
  seedFilePaths: string[];
  maxContextItems?: number;
}

export interface RunSecurityAgentResult {
  output: SecurityAgentOutput;
  inputContract: AgentRunInputContract;
  contextItems: RetrievedContextItem[];
  containsPromptInjection: boolean;
  raisedFindingIds: string[];
}

function assertDiscoveryOutputMatchesWorkItem(
  discoveryOutput: DiscoveryAgentOutput,
  workItemId: string,
): void {
  if (discoveryOutput.workItemId !== workItemId) {
    throw new AgentRunScopeError("Discovery output does not match the work item");
  }
}

function assertExecutionEvidenceMatchesWorkItem(
  executionEvidence: ExecutionEvidence,
  workItemId: string,
  tenantContext: TenantContext,
): void {
  if (executionEvidence.workItemId !== workItemId) {
    throw new AgentRunScopeError("Execution evidence does not match the work item");
  }

  if (executionEvidence.organizationId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Execution evidence is outside the tenant scope");
  }
}

export async function runSecurityAgent(
  command: RunSecurityAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  findingStore: FindingStore,
  contentPort: GitHubRepositoryContentPort,
  operationContext: IdentityOperationContext,
): Promise<RunSecurityAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  assertDiscoveryOutputMatchesWorkItem(command.discoveryOutput, command.workItemId);
  assertExecutionEvidenceMatchesWorkItem(
    command.executionEvidence,
    command.workItemId,
    command.tenantContext,
  );

  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

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

  const inputContract = buildSecurityAgentInputContract(
    command.workItemId,
    toAgentRunContextItems(contextResult.items),
  );

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "security",
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

  const reviewFindings = buildSecurityReviewFindings({
    workItem,
    discoveryOutput: command.discoveryOutput,
    executionEvidence: command.executionEvidence,
    createId: () => operationContext.createId(),
  });

  const raisedFindingIds: string[] = [];
  for (const proposal of reviewFindings) {
    const finding = await raiseFinding(
      {
        tenantContext: command.tenantContext,
        workItemId: command.workItemId,
        category: "security",
        severity: proposal.severity,
        title: proposal.title,
        evidence: proposal.evidence,
        remediation: proposal.remediation,
      },
      workItemStore,
      findingStore,
      operationContext,
    );
    raisedFindingIds.push(finding.id);
  }

  const output = createSecurityAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: createdRun.run.id,
      discoveryRunId: command.discoveryOutput.agentRunId,
      executionEvidenceId: command.executionEvidence.id,
      threatModel: buildSecurityThreatModel({
        workItem,
        discoveryOutput: command.discoveryOutput,
        executionEvidence: command.executionEvidence,
        createId: () => operationContext.createId(),
      }),
      reviewFindings,
      raisedFindingIds,
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
    raisedFindingIds,
  };
}
