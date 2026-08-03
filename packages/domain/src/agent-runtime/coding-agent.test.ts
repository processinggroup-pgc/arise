import { describe, expect, it } from "vitest";

import type { ArchitectureAgentOutput } from "./architecture-agent.js";
import {
  buildCodingAgentInputContract,
  buildCodingTaskFromArchitecture,
  buildCodingTaskImplementationPlan,
  createCodingAgentOutput,
} from "./coding-agent.js";
import type { WorkItem } from "../intent/work-item.js";

const workItem: WorkItem = {
  id: "work_item_1",
  lineageId: "lineage_1",
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
  acceptanceCriteria: [],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

const architectureOutput: ArchitectureAgentOutput = {
  schemaRef: "schemas/architecture-output.schema.json",
  workItemId: "work_item_1",
  agentRunId: "run_arch_1",
  discoveryRunId: "run_disc_1",
  options: [
    {
      id: "option_1",
      title: "Extend existing modules",
      summary: "Evolve modules near src/memberships/route.ts.",
      tradeoffs: ["Lower integration cost"],
      affectedPaths: ["src/memberships/route.ts"],
      riskLevel: "medium",
    },
    {
      id: "option_2",
      title: "Introduce a boundary module",
      summary: "Add a dedicated boundary module.",
      tradeoffs: ["Improves isolation"],
      affectedPaths: ["src/memberships/route.ts"],
      riskLevel: "high",
    },
  ],
  preferredOptionId: "option_1",
  decisionRecord: {
    title: "Architecture decision",
    context: "Onboarding is fragmented.",
    decision: "Extend existing modules",
    status: "draft",
    consequences: ["Lower integration cost"],
    openQuestions: [],
  },
  generatedAt: "2026-08-03T12:00:00.000Z",
};

describe("coding agent contracts", () => {
  it("allows repository and git execution tools", () => {
    const contract = buildCodingAgentInputContract("work_item_1", []);
    expect(contract.allowedTools).toEqual([
      "repository.read_file",
      "repository.search",
      "repository.write_file",
      "repository.diff",
      "git.create_branch",
      "git.commit",
    ]);
  });

  it("builds one coding task from the preferred architecture option", () => {
    const task = buildCodingTaskFromArchitecture({
      workItem,
      architectureOutput,
      createId: () => "task_1",
    });

    expect(task.id).toBe("task_1");
    expect(task.targetPaths[0]).toBe("src/memberships/route.test.ts");
    expect(task.branchName).toContain("work_item_1");
  });

  it("plans failing tests before implementation changes", () => {
    const task = buildCodingTaskFromArchitecture({
      workItem,
      architectureOutput,
      createId: () => "task_1",
    });

    const plan = buildCodingTaskImplementationPlan(task, workItem, {
      "src/memberships/route.ts": "export function listMemberships() {}",
    });

    expect(plan).toHaveLength(2);
    expect(plan[0]?.phase).toBe("test");
    expect(plan[0]?.content).toContain("expect(false).toBe(true)");
    expect(plan[1]?.phase).toBe("implementation");
  });

  it("creates validated coding agent output", () => {
    const task = buildCodingTaskFromArchitecture({
      workItem,
      architectureOutput,
      createId: () => "task_1",
    });

    const output = createCodingAgentOutput(
      {
        workItemId: "work_item_1",
        agentRunId: "run_coding_1",
        architectureRunId: "run_arch_1",
        executionSessionId: "session_1",
        task,
        executionEvidence: {
          branchName: "feature/work_item_1",
          commitId: "fake_commit_1",
          changedPaths: ["src/memberships/route.test.ts", "src/memberships/route.ts"],
          toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
          diffs: [],
        },
      },
      { generatedAt: new Date("2026-08-03T12:00:00.000Z") },
    );

    expect(output.schemaRef).toBe("schemas/coding-output.schema.json");
    expect(output.task.id).toBe("task_1");
  });
});
