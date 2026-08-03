import { describe, expect, it } from "vitest";

import type { DiscoveryAgentOutput } from "./discovery-agent.js";
import type { ExecutionEvidence } from "../execution/execution-evidence.js";
import type { WorkItem } from "../intent/work-item.js";
import {
  buildSecurityAgentInputContract,
  buildSecurityReviewFindings,
  buildSecurityThreatModel,
  createSecurityAgentOutput,
} from "./security-agent.js";

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
  dataClassification: "authentication",
  constraints: [],
  nonGoals: [],
  affectedSystems: ["memberships API"],
  dependencies: [],
  decisionAuthority: "user_owner",
  unresolvedQuestions: [],
  acceptanceCriteria: [],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

const discoveryOutput: DiscoveryAgentOutput = {
  schemaRef: "schemas/discovery-output.schema.json",
  workItemId: "work_item_1",
  agentRunId: "run_disc_1",
  repositoryMap: {
    repositoryId: "repo_1",
    fileCount: 1,
    symbolCount: 1,
    dependencyCount: 0,
    testMapCount: 0,
    files: [],
    symbols: [],
    dependencies: [],
    testMaps: [],
  },
  assessmentEvidence: {
    summary: "Indexed repository",
    observedRisks: ["Prompt injection pattern detected: ignore-previous-instructions"],
    contextItemCount: 1,
    containsPromptInjection: true,
    seedFilePaths: ["src/memberships/route.ts"],
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
      after: 'const api_key = "leaked";\nexport function listMemberships() {}',
    },
  ],
  toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
  capturedAt: new Date("2026-08-03T12:00:00.000Z"),
};

describe("security agent contracts", () => {
  it("allows read-only repository tools", () => {
    const contract = buildSecurityAgentInputContract("work_item_1", []);
    expect(contract.allowedTools).toEqual(["repository.read_file", "repository.search"]);
  });

  it("builds a threat model and non-waivable review findings from evidence", () => {
    const threatModel = buildSecurityThreatModel({
      workItem,
      discoveryOutput,
      executionEvidence,
      createId: () => "threat_1",
    });
    const reviewFindings = buildSecurityReviewFindings({
      workItem,
      discoveryOutput,
      executionEvidence,
      createId: (() => {
        let counter = 0;
        return () => `finding_${String(++counter)}`;
      })(),
    });

    expect(threatModel.threats.length).toBeGreaterThan(0);
    expect(reviewFindings.some((finding) => finding.title.includes("secret material"))).toBe(true);
    expect(reviewFindings.length).toBeGreaterThan(0);
  });

  it("creates validated security agent output", () => {
    const reviewFindings = buildSecurityReviewFindings({
      workItem,
      discoveryOutput,
      executionEvidence,
      createId: () => "finding_1",
    });

    const output = createSecurityAgentOutput(
      {
        workItemId: "work_item_1",
        agentRunId: "run_security_1",
        discoveryRunId: "run_disc_1",
        executionEvidenceId: "evidence_1",
        threatModel: buildSecurityThreatModel({
          workItem,
          discoveryOutput,
          executionEvidence,
          createId: () => "threat_1",
        }),
        reviewFindings,
        raisedFindingIds: ["finding_record_1"],
      },
      { generatedAt: new Date("2026-08-03T12:00:00.000Z") },
    );

    expect(output.schemaRef).toBe("schemas/security-output.schema.json");
    expect(output.raisedFindingIds).toHaveLength(1);
  });
});
