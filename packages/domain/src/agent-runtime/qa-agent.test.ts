import { describe, expect, it } from "vitest";

import type { WorkItem } from "../intent/work-item.js";
import {
  buildAcceptanceCriterionTestPlan,
  buildQaAgentInputContract,
  createQaAgentOutput,
} from "./qa-agent.js";

const workItem: WorkItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 1,
  title: "Improve membership onboarding",
  type: "feature",
  state: "ready",
  riskLevel: "medium",
  ownerId: "user_owner",
  problemStatement: "Onboarding is fragmented.",
  targetUser: "Platform engineer",
  currentBehavior: "Onboarding requires manual steps.",
  desiredBehavior: "Onboarding completes in one workflow.",
  measurableOutcome: "Onboarding completes in one path.",
  dataClassification: "internal",
  constraints: [],
  nonGoals: [],
  affectedSystems: [],
  dependencies: [],
  decisionAuthority: "user_owner",
  unresolvedQuestions: [],
  acceptanceCriteria: [
    {
      given: "A new member account",
      when: "They start onboarding",
      then: "The workflow completes in one path",
    },
    {
      given: "An incomplete profile",
      when: "Onboarding resumes",
      then: "Progress is restored",
    },
  ],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

describe("qa agent contracts", () => {
  it("allows repository and git tools for independent test authoring", () => {
    const contract = buildQaAgentInputContract("work_item_1", []);
    expect(contract.allowedTools).toContain("repository.write_file");
    expect(contract.allowedTools).toContain("git.commit");
  });

  it("builds failing tests from acceptance criteria with stable trace references", () => {
    const plan = buildAcceptanceCriterionTestPlan(workItem);

    expect(plan).toHaveLength(2);
    expect(plan[0]?.traceRef).toBe("WI-lineage1-REQ-1-AC-1");
    expect(plan[0]?.path).toBe("tests/acceptance/lineage1-ac-1.test.ts");
    expect(plan[0]?.content).toContain("expect(false).toBe(true)");
    expect(plan[0]?.content).not.toContain("src/");
  });

  it("creates validated qa agent output", () => {
    const plan = buildAcceptanceCriterionTestPlan(workItem);

    const output = createQaAgentOutput(
      {
        workItemId: "work_item_1",
        agentRunId: "run_qa_1",
        executionSessionId: "session_1",
        generatedTests: plan.map((entry) => ({
          traceRef: entry.traceRef,
          criterionIndex: entry.criterionIndex,
          path: entry.path,
          given: entry.given,
          when: entry.when,
          then: entry.then,
        })),
        executionEvidence: {
          branchName: "qa/work_item_1",
          commitId: "fake_commit_1",
          changedPaths: plan.map((entry) => entry.path),
          toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
          diffs: [],
        },
      },
      { generatedAt: new Date("2026-08-03T12:00:00.000Z") },
    );

    expect(output.schemaRef).toBe("schemas/qa-output.schema.json");
    expect(output.generatedTests).toHaveLength(2);
  });
});
