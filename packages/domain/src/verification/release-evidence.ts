import type { Approval, ApprovalStatus, ApprovalType } from "../governance/approval.js";
import type { RequirementCoverageItem, ReviewVerdict } from "../agent-runtime/reviewer-agent.js";
import type { WorkItem } from "../intent/work-item.js";
import {
  evaluateReleaseBlockingFindings,
  type Finding,
  type FindingCategory,
  type FindingSeverity,
  type FindingStatus,
} from "./finding.js";
import type { TestCategory, TestRun, TestRunCounts, TestRunStatus } from "./test-run.js";

export const RELEASE_EVIDENCE_STATUSES = ["draft", "complete", "blocked", "approved"] as const;
export type ReleaseEvidenceStatus = (typeof RELEASE_EVIDENCE_STATUSES)[number];

export const REQUIREMENT_COVERAGE_STATUSES = ["covered", "partial", "missing"] as const;
export type RequirementCoverageStatus = (typeof REQUIREMENT_COVERAGE_STATUSES)[number];

export interface ReleaseEvidenceRequirementCoverage {
  criterionIndex: number;
  given: string;
  when: string;
  then: string;
  status: RequirementCoverageStatus;
  evidence: string;
}

export interface ReleaseEvidenceTestSummary {
  category: TestCategory;
  status: TestRunStatus;
  artifactRef: string;
  counts: TestRunCounts;
}

export interface ReleaseEvidencePolicySummary {
  name: string;
  status: "passed" | "failed";
  evidence: string;
}

export interface ReleaseEvidenceFindingSummary {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  status: FindingStatus;
  blocking: boolean;
}

export interface ReleaseEvidenceApprovalSummary {
  id: string;
  approvalType: ApprovalType;
  status: ApprovalStatus;
  requestedFrom: string;
}

export interface ReleaseEvidence {
  id: string;
  organizationId: string;
  workItemId: string;
  workItemVersion: number;
  status: ReleaseEvidenceStatus;
  complete: boolean;
  requirementCoverage: ReleaseEvidenceRequirementCoverage[];
  tests: ReleaseEvidenceTestSummary[];
  policies: ReleaseEvidencePolicySummary[];
  findings: ReleaseEvidenceFindingSummary[];
  approvals: ReleaseEvidenceApprovalSummary[];
  blockers: string[];
  generatedAt: Date;
}

export interface CreateReleaseEvidenceInput {
  organizationId: string;
  workItemId: string;
  workItemVersion: number;
  status: ReleaseEvidenceStatus;
  complete: boolean;
  requirementCoverage: ReleaseEvidenceRequirementCoverage[];
  tests: ReleaseEvidenceTestSummary[];
  policies: ReleaseEvidencePolicySummary[];
  findings: ReleaseEvidenceFindingSummary[];
  approvals: ReleaseEvidenceApprovalSummary[];
  blockers: string[];
}

export interface CreateReleaseEvidenceMetadata {
  id: string;
  generatedAt: Date;
}

export interface EvaluateReleaseEvidenceCompletenessInput {
  requirementCoverage: ReleaseEvidenceRequirementCoverage[];
  testRuns: TestRun[];
  findings: Finding[];
  verificationPassed: boolean;
  reviewerVerdict?: ReviewVerdict;
}

export interface ReleaseEvidenceCompletenessEvaluation {
  complete: boolean;
  status: ReleaseEvidenceStatus;
  blockers: string[];
}

function assertReleaseEvidenceStatus(status: ReleaseEvidenceStatus): ReleaseEvidenceStatus {
  if (!(RELEASE_EVIDENCE_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Release evidence status is invalid");
  }

  return status;
}

export function buildReleaseEvidenceRequirementCoverage(
  workItem: WorkItem,
  defaultStatus: RequirementCoverageStatus = "missing",
): ReleaseEvidenceRequirementCoverage[] {
  return workItem.acceptanceCriteria.map((criterion, criterionIndex) => ({
    criterionIndex,
    given: criterion.given,
    when: criterion.when,
    then: criterion.then,
    status: defaultStatus,
    evidence:
      defaultStatus === "covered"
        ? "Acceptance criterion linked to automated test evidence"
        : "Acceptance criterion lacks automated or approved manual evidence",
  }));
}

export function mergeReviewerRequirementCoverage(
  baseCoverage: ReleaseEvidenceRequirementCoverage[],
  reviewerCoverage: RequirementCoverageItem[],
): ReleaseEvidenceRequirementCoverage[] {
  return baseCoverage.map((item) => {
    const reviewerItem = reviewerCoverage.find(
      (coverage) => coverage.criterionIndex === item.criterionIndex,
    );

    if (reviewerItem === undefined) {
      return item;
    }

    return {
      ...item,
      status: reviewerItem.status,
      evidence: reviewerItem.evidence,
    };
  });
}

export function buildReleaseEvidenceTestSummaries(testRuns: TestRun[]): ReleaseEvidenceTestSummary[] {
  return testRuns.map((run) => ({
    category: run.category,
    status: run.status,
    artifactRef: run.artifactRef,
    counts: run.counts,
  }));
}

export function buildReleaseEvidencePolicySummaries(input: {
  verificationPassed: boolean;
  reviewerVerdict?: ReviewVerdict;
  hasLinkedTests?: boolean;
  hasImplementationChanges?: boolean;
}): ReleaseEvidencePolicySummary[] {
  const policies: ReleaseEvidencePolicySummary[] = [
    {
      name: "verification_orchestration",
      status: input.verificationPassed ? "passed" : "failed",
      evidence: input.verificationPassed
        ? "All required test categories passed"
        : "One or more required test categories failed",
    },
  ];

  if (input.reviewerVerdict !== undefined) {
    policies.push({
      name: "reviewer_verdict",
      status: input.reviewerVerdict === "approved" ? "passed" : "failed",
      evidence: `Reviewer verdict: ${input.reviewerVerdict}`,
    });
  }

  if (input.hasImplementationChanges !== undefined && input.hasLinkedTests !== undefined) {
    const tddPassed = !input.hasImplementationChanges || input.hasLinkedTests;
    policies.push({
      name: "tdd_linked_tests",
      status: tddPassed ? "passed" : "failed",
      evidence: tddPassed
        ? "Changed behavior includes linked test evidence"
        : "Changed behavior lacks linked test evidence",
    });
  }

  return policies;
}

export function buildReleaseEvidenceFindingSummaries(findings: Finding[]): ReleaseEvidenceFindingSummary[] {
  return findings.map((finding) => ({
    id: finding.id,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    status: finding.status,
    blocking: evaluateReleaseBlockingFindings([finding]).length > 0,
  }));
}

export function buildReleaseEvidenceApprovalSummaries(
  approvals: Approval[],
): ReleaseEvidenceApprovalSummary[] {
  return approvals.map((approval) => ({
    id: approval.id,
    approvalType: approval.approvalType,
    status: approval.status,
    requestedFrom: approval.requestedFrom,
  }));
}

export function evaluateReleaseEvidenceCompleteness(
  input: EvaluateReleaseEvidenceCompletenessInput,
): ReleaseEvidenceCompletenessEvaluation {
  const blockers: string[] = [];

  for (const coverage of input.requirementCoverage) {
    if (coverage.status !== "covered") {
      blockers.push(
        `Acceptance criterion ${String(coverage.criterionIndex + 1)} lacks complete evidence (${coverage.status})`,
      );
    }
  }

  if (!input.verificationPassed) {
    blockers.push("Required verification categories did not all pass");
  }

  for (const run of input.testRuns) {
    if (run.status === "failed") {
      blockers.push(`Test category ${run.category} failed`);
    }
  }

  const releaseBlockingFindings = evaluateReleaseBlockingFindings(input.findings);
  if (releaseBlockingFindings.length > 0) {
    blockers.push(
      `${String(releaseBlockingFindings.length)} release-blocking finding(s) remain unresolved`,
    );
  }

  if (input.reviewerVerdict === "changes_requested") {
    blockers.push("Reviewer requested changes before release");
  }

  const hasHardBlockers =
    releaseBlockingFindings.length > 0 ||
    !input.verificationPassed ||
    input.testRuns.some((run) => run.status === "failed") ||
    input.reviewerVerdict === "changes_requested";

  const complete = blockers.length === 0;

  return {
    complete,
    status: hasHardBlockers ? "blocked" : complete ? "complete" : "draft",
    blockers,
  };
}

export function createReleaseEvidence(
  input: CreateReleaseEvidenceInput,
  metadata: CreateReleaseEvidenceMetadata,
): ReleaseEvidence {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Release evidence identifiers are required");
  }

  if (input.workItemVersion < 1) {
    throw new Error("Release evidence work item version is invalid");
  }

  if (input.complete && input.status === "blocked") {
    throw new Error("Release evidence cannot be complete and blocked");
  }

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    workItemVersion: input.workItemVersion,
    status: assertReleaseEvidenceStatus(input.status),
    complete: input.complete,
    requirementCoverage: input.requirementCoverage,
    tests: input.tests,
    policies: input.policies,
    findings: input.findings,
    approvals: input.approvals,
    blockers: input.blockers,
    generatedAt: metadata.generatedAt,
  };
}
