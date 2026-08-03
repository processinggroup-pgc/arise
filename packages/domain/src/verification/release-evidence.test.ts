import { describe, expect, it } from "vitest";

import type { Approval } from "../governance/approval.js";
import type { Finding } from "./finding.js";
import type { TestRun } from "./test-run.js";
import type { WorkItem } from "../intent/work-item.js";
import {
  buildReleaseEvidenceApprovalSummaries,
  buildReleaseEvidenceFindingSummaries,
  buildReleaseEvidencePolicySummaries,
  buildReleaseEvidenceRequirementCoverage,
  buildReleaseEvidenceTestSummaries,
  createReleaseEvidence,
  evaluateReleaseEvidenceCompleteness,
} from "./release-evidence.js";

const workItem: WorkItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 2,
  title: "Improve membership onboarding",
  type: "feature",
  state: "verifying",
  riskLevel: "high",
  ownerId: "user_owner",
  problemStatement: "Onboarding is fragmented.",
  targetUser: "Platform engineer",
  currentBehavior: "Onboarding requires manual steps.",
  desiredBehavior: "Onboarding completes in one workflow.",
  measurableOutcome: "Onboarding completes in one path.",
  dataClassification: "internal",
  constraints: [],
  nonGoals: [],
  affectedSystems: ["memberships API"],
  dependencies: [],
  decisionAuthority: "user_owner",
  unresolvedQuestions: [],
  acceptanceCriteria: [
    {
      given: "A new member account",
      when: "They start onboarding",
      then: "The workflow completes in one path",
    },
  ],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

const passedTestRun: TestRun = {
  id: "run_unit_1",
  organizationId: "org_123",
  executionSessionId: "session_1",
  workItemId: "work_item_1",
  category: "unit",
  command: "pnpm test:unit",
  status: "passed",
  counts: { passed: 10, failed: 0, skipped: 0, total: 10 },
  durationMs: 1200,
  artifactRef: "verification/session_1/unit/run_unit_1.json",
  startedAt: new Date("2026-08-03T12:00:00.000Z"),
  endedAt: new Date("2026-08-03T12:05:00.000Z"),
};

const openFinding: Finding = {
  id: "finding_1",
  organizationId: "org_123",
  workItemId: "work_item_1",
  category: "security",
  severity: "critical",
  title: "Secret material detected",
  evidence: "execution/session_1/tool_1.json",
  remediation: "Remove secrets and rotate credentials",
  status: "open",
  raisedAt: new Date("2026-08-03T12:00:00.000Z"),
  updatedAt: new Date("2026-08-03T12:00:00.000Z"),
};

const releaseApproval: Approval = {
  id: "approval_1",
  organizationId: "org_123",
  subjectType: "work_item",
  subjectId: "work_item_1",
  approvalType: "release_approval",
  requestedFrom: "user_owner",
  status: "pending",
  expiresAt: null,
  decidedBy: null,
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
  decidedAt: null,
};

describe("release evidence generation", () => {
  it("marks coverage incomplete when acceptance criteria lack evidence", () => {
    const coverage = buildReleaseEvidenceRequirementCoverage(workItem, "partial");
    const evaluation = evaluateReleaseEvidenceCompleteness({
      requirementCoverage: coverage,
      testRuns: [passedTestRun],
      findings: [],
      verificationPassed: true,
    });

    expect(evaluation.complete).toBe(false);
    expect(evaluation.status).toBe("draft");
    expect(evaluation.blockers.some((blocker) => blocker.includes("Acceptance criterion"))).toBe(
      true,
    );
  });

  it("blocks release evidence when critical findings remain open", () => {
    const coverage = buildReleaseEvidenceRequirementCoverage(workItem, "covered");
    const evaluation = evaluateReleaseEvidenceCompleteness({
      requirementCoverage: coverage,
      testRuns: [passedTestRun],
      findings: [openFinding],
      verificationPassed: true,
    });

    expect(evaluation.complete).toBe(false);
    expect(evaluation.status).toBe("blocked");
    expect(
      evaluation.blockers.some((blocker) => blocker.includes("release-blocking finding")),
    ).toBe(true);
  });

  it("creates complete release evidence when all gates pass", () => {
    const coverage = buildReleaseEvidenceRequirementCoverage(workItem, "covered");
    const tests = buildReleaseEvidenceTestSummaries([passedTestRun]);
    const policies = buildReleaseEvidencePolicySummaries({
      verificationPassed: true,
      reviewerVerdict: "approved",
    });
    const findings = buildReleaseEvidenceFindingSummaries([]);
    const approvals = buildReleaseEvidenceApprovalSummaries([releaseApproval]);
    const evaluation = evaluateReleaseEvidenceCompleteness({
      requirementCoverage: coverage,
      testRuns: [passedTestRun],
      findings: [],
      verificationPassed: true,
      reviewerVerdict: "approved",
    });

    const evidence = createReleaseEvidence(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        workItemVersion: workItem.version,
        requirementCoverage: coverage,
        tests,
        policies,
        findings,
        approvals,
        complete: evaluation.complete,
        status: evaluation.status,
        blockers: evaluation.blockers,
      },
      {
        id: "release_evidence_1",
        generatedAt: new Date("2026-08-03T12:10:00.000Z"),
      },
    );

    expect(evidence.complete).toBe(true);
    expect(evidence.status).toBe("complete");
    expect(evidence.tests).toHaveLength(1);
    expect(evidence.approvals[0]?.approvalType).toBe("release_approval");
  });
});
