import { describe, expect, it } from "vitest";

import type { ArchitectureAgentOutput } from "./architecture-agent.js";
import type { ExecutionEvidence } from "../execution/execution-evidence.js";
import type { WorkItem } from "../intent/work-item.js";
import {
  buildConstitutionReviewFindings,
  buildRequirementCoverageReview,
  buildReviewerAgentInputContract,
  createReviewerAgentOutput,
  DEFAULT_PLATFORM_CONSTITUTION,
  determineReviewVerdict,
} from "./reviewer-agent.js";

const workItem: WorkItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 1,
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

const architectureOutput: ArchitectureAgentOutput = {
  schemaRef: "schemas/architecture-output.schema.json",
  workItemId: "work_item_1",
  agentRunId: "run_arch_1",
  discoveryRunId: "run_disc_1",
  options: [],
  preferredOptionId: "option_1",
  decisionRecord: {
    title: "Onboarding orchestration",
    context: "Fragmented onboarding",
    decision: "Use a single workflow module",
    status: "draft",
    consequences: [],
    openQuestions: [],
  },
  generatedAt: "2026-08-03T12:00:00.000Z",
};

const executionEvidence: ExecutionEvidence = {
  id: "evidence_1",
  organizationId: "org_123",
  executionSessionId: "session_1",
  agentRunId: "run_coding_1",
  workItemId: "work_item_1",
  branchName: "feature/work_item_1",
  commitId: "fake_commit_1",
  changedPaths: ["src/memberships/route.ts"],
  diffs: [
    {
      path: "src/memberships/route.ts",
      before: "export function listMemberships() {}",
      after: "export function listMemberships() { return []; }",
    },
  ],
  toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
  capturedAt: new Date("2026-08-03T12:00:00.000Z"),
};

describe("reviewer agent contracts", () => {
  it("allows read-only repository tools", () => {
    const contract = buildReviewerAgentInputContract("work_item_1", []);
    expect(contract.allowedTools).toEqual(["repository.read_file", "repository.search"]);
  });

  it("flags missing linked tests and incomplete requirement coverage", () => {
    const coverage = buildRequirementCoverageReview(workItem, executionEvidence);
    const constitutionFindings = buildConstitutionReviewFindings({
      workItem,
      executionEvidence,
      constitution: DEFAULT_PLATFORM_CONSTITUTION,
      createId: () => "finding_1",
    });
    const verdict = determineReviewVerdict(coverage, constitutionFindings, []);

    expect(coverage[0]?.status).toBe("partial");
    expect(constitutionFindings.some((finding) => finding.title.includes("linked test"))).toBe(true);
    expect(verdict).toBe("changes_requested");
  });

  it("creates validated reviewer output", () => {
    const coverage = buildRequirementCoverageReview(workItem, executionEvidence);
    const findings = buildConstitutionReviewFindings({
      workItem,
      executionEvidence,
      constitution: DEFAULT_PLATFORM_CONSTITUTION,
      createId: () => "finding_1",
    });

    const output = createReviewerAgentOutput(
      {
        workItemId: "work_item_1",
        agentRunId: "run_reviewer_1",
        codingRunId: "run_coding_1",
        executionEvidenceId: "evidence_1",
        architectureRunId: architectureOutput.agentRunId,
        verdict: determineReviewVerdict(coverage, findings, []),
        summary: "Review completed with requested changes.",
        requirementCoverage: coverage,
        findings,
        raisedFindingIds: ["finding_record_1"],
      },
      { generatedAt: new Date("2026-08-03T12:00:00.000Z") },
    );

    expect(output.schemaRef).toBe("schemas/reviewer-output.schema.json");
    expect(output.verdict).toBe("changes_requested");
  });
});
