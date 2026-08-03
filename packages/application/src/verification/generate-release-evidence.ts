import {
  buildReleaseEvidenceApprovalSummaries,
  buildReleaseEvidenceFindingSummaries,
  buildReleaseEvidencePolicySummaries,
  buildReleaseEvidenceRequirementCoverage,
  buildReleaseEvidenceTestSummaries,
  createReleaseEvidence,
  evaluateReleaseEvidenceCompleteness,
  mergeReviewerRequirementCoverage,
  type ExecutionEvidence,
  type ReleaseEvidence,
  type ReleaseEvidenceCompletenessEvaluation,
  type ReviewerAgentOutput,
  type TenantContext,
  type VerificationOrchestrationResult,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import { ExecutionSessionScopeError } from "../execution/provision-execution-session.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { ApprovalStore } from "../governance/approval-store.js";
import type { FindingStore } from "./finding-store.js";
import type { ReleaseEvidenceStore } from "./release-evidence-store.js";
import type { TestRunStore } from "./test-run-store.js";

export interface GenerateReleaseEvidenceCommand {
  tenantContext: TenantContext;
  workItemId: string;
  executionSessionId: string;
  verificationEvaluation: VerificationOrchestrationResult;
  reviewerOutput?: ReviewerAgentOutput;
  executionEvidence?: ExecutionEvidence;
}

export interface GenerateReleaseEvidenceResult {
  evidence: ReleaseEvidence;
  evaluation: ReleaseEvidenceCompletenessEvaluation;
}

function hasImplementationChanges(changedPaths: string[]): boolean {
  return changedPaths.some((path) => /^(src|lib|apps|packages)\//u.test(path));
}

function hasLinkedTestChanges(changedPaths: string[]): boolean {
  return changedPaths.some((path) => /\.(test|spec)\.[jt]sx?$/u.test(path));
}

export async function generateReleaseEvidence(
  command: GenerateReleaseEvidenceCommand,
  workItemStore: WorkItemStore,
  executionSessionStore: ExecutionSessionStore,
  testRunStore: TestRunStore,
  findingStore: FindingStore,
  approvalStore: ApprovalStore,
  releaseEvidenceStore: ReleaseEvidenceStore,
  operationContext: IdentityOperationContext,
): Promise<GenerateReleaseEvidenceResult> {
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

  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new ExecutionSessionScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Work item is outside the tenant scope");
  }

  if (
    command.reviewerOutput !== undefined &&
    command.reviewerOutput.workItemId !== command.workItemId
  ) {
    throw new ExecutionSessionScopeError("Reviewer output does not match the work item");
  }

  if (
    command.executionEvidence !== undefined &&
    command.executionEvidence.workItemId !== command.workItemId
  ) {
    throw new ExecutionSessionScopeError("Execution evidence does not match the work item");
  }

  const testRuns = await testRunStore.listTestRunsForExecutionSession(command.executionSessionId);
  const findings = await findingStore.listFindingsForWorkItem(command.workItemId);
  const approvals = await approvalStore.listApprovalsForSubject(
    command.tenantContext.organizationId,
    "work_item",
    command.workItemId,
  );

  let requirementCoverage = buildReleaseEvidenceRequirementCoverage(workItem);
  if (command.reviewerOutput !== undefined) {
    requirementCoverage = mergeReviewerRequirementCoverage(
      requirementCoverage,
      command.reviewerOutput.requirementCoverage,
    );
  }

  const tests = buildReleaseEvidenceTestSummaries(testRuns);
  const policies = buildReleaseEvidencePolicySummaries({
    verificationPassed: command.verificationEvaluation.passed,
    ...(command.reviewerOutput === undefined
      ? {}
      : { reviewerVerdict: command.reviewerOutput.verdict }),
    ...(command.executionEvidence === undefined
      ? {}
      : {
          hasImplementationChanges: hasImplementationChanges(command.executionEvidence.changedPaths),
          hasLinkedTests: hasLinkedTestChanges(command.executionEvidence.changedPaths),
        }),
  });
  const findingSummaries = buildReleaseEvidenceFindingSummaries(findings);
  const approvalSummaries = buildReleaseEvidenceApprovalSummaries(approvals);

  const evaluation = evaluateReleaseEvidenceCompleteness({
    requirementCoverage,
    testRuns,
    findings,
    verificationPassed: command.verificationEvaluation.passed,
    ...(command.reviewerOutput === undefined
      ? {}
      : { reviewerVerdict: command.reviewerOutput.verdict }),
  });

  const evidence = createReleaseEvidence(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      workItemVersion: workItem.version,
      status: evaluation.status,
      complete: evaluation.complete,
      requirementCoverage,
      tests,
      policies,
      findings: findingSummaries,
      approvals: approvalSummaries,
      blockers: evaluation.blockers,
    },
    {
      id: operationContext.createId(),
      generatedAt: operationContext.now(),
    },
  );

  await releaseEvidenceStore.saveReleaseEvidence(evidence);

  return {
    evidence,
    evaluation,
  };
}
