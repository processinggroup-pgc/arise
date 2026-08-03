import {
  buildConstitutionReviewFindings,
  buildQualityReviewFindings,
  buildRequirementCoverageReview,
  buildReviewerAgentInputContract,
  completeAgentRun,
  createReviewerAgentOutput,
  DEFAULT_PLATFORM_CONSTITUTION,
  determineReviewVerdict,
  mapReviewFindingToFindingCategory,
  type AgentRunInputContract,
  type ArchitectureAgentOutput,
  type ExecutionEvidence,
  type PlatformConstitution,
  type RetrievedContextItem,
  type ReviewerAgentOutput,
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

export interface RunReviewerAgentCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  registeredModelId: string;
  architectureOutput: ArchitectureAgentOutput;
  executionEvidence: ExecutionEvidence;
  seedFilePaths: string[];
  constitution?: PlatformConstitution;
  maxContextItems?: number;
}

export interface RunReviewerAgentResult {
  output: ReviewerAgentOutput;
  inputContract: AgentRunInputContract;
  contextItems: RetrievedContextItem[];
  containsPromptInjection: boolean;
  raisedFindingIds: string[];
}

function assertArchitectureOutputMatchesWorkItem(
  architectureOutput: ArchitectureAgentOutput,
  workItemId: string,
): void {
  if (architectureOutput.workItemId !== workItemId) {
    throw new AgentRunScopeError("Architecture output does not match the work item");
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

function buildReviewSummary(verdict: ReviewerAgentOutput["verdict"], findingCount: number): string {
  if (verdict === "approved") {
    return "Review approved against requirements, constitution, and quality standards.";
  }

  return `Review requested changes after identifying ${String(findingCount)} findings.`;
}

export async function runReviewerAgent(
  command: RunReviewerAgentCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  findingStore: FindingStore,
  contentPort: GitHubRepositoryContentPort,
  operationContext: IdentityOperationContext,
): Promise<RunReviewerAgentResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  assertArchitectureOutputMatchesWorkItem(command.architectureOutput, command.workItemId);
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

  const inputContract = buildReviewerAgentInputContract(
    command.workItemId,
    toAgentRunContextItems(contextResult.items),
  );

  const createdRun = await createAgentRunForWorkItem(
    {
      tenantContext: command.tenantContext,
      workItemId: command.workItemId,
      agentType: "reviewer",
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

  const constitution = command.constitution ?? DEFAULT_PLATFORM_CONSTITUTION;
  const requirementCoverage = buildRequirementCoverageReview(workItem, command.executionEvidence);
  const constitutionFindings = buildConstitutionReviewFindings({
    workItem,
    executionEvidence: command.executionEvidence,
    constitution,
    createId: () => operationContext.createId(),
  });
  const qualityFindings = buildQualityReviewFindings({
    workItem,
    executionEvidence: command.executionEvidence,
    createId: () => operationContext.createId(),
  });
  const reviewFindings = [...constitutionFindings, ...qualityFindings];
  const verdict = determineReviewVerdict(
    requirementCoverage,
    constitutionFindings,
    qualityFindings,
  );

  const raisedFindingIds: string[] = [];
  for (const finding of reviewFindings.filter((item) => item.blocking)) {
    const savedFinding = await raiseFinding(
      {
        tenantContext: command.tenantContext,
        workItemId: command.workItemId,
        category: mapReviewFindingToFindingCategory(finding),
        severity: finding.severity,
        title: finding.title,
        evidence: finding.evidence,
        remediation: finding.remediation,
      },
      workItemStore,
      findingStore,
      operationContext,
    );
    raisedFindingIds.push(savedFinding.id);
  }

  const output = createReviewerAgentOutput(
    {
      workItemId: command.workItemId,
      agentRunId: createdRun.run.id,
      codingRunId: command.executionEvidence.agentRunId,
      executionEvidenceId: command.executionEvidence.id,
      architectureRunId: command.architectureOutput.agentRunId,
      verdict,
      summary: buildReviewSummary(verdict, reviewFindings.length),
      requirementCoverage,
      findings: reviewFindings,
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
