import type {
  AgentRunBudget,
  AgentRunContextItem,
  AgentRunInputContract,
} from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import { REPOSITORY_GIT_TOOL_NAMES } from "../execution/repository-git-tools.js";
import type { AcceptanceCriterion, WorkItem } from "../intent/work-item.js";
import { buildAutomatedTestRef } from "../intent/requirement-acceptance-criterion.js";

export const QA_AGENT_ROLE = "QA Agent";
export const QA_OUTPUT_SCHEMA_REF = "schemas/qa-output.schema.json";

export const QA_AGENT_ALLOWED_TOOLS = [...REPOSITORY_GIT_TOOL_NAMES] as const;

export const QA_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 25,
  maxCostUsd: 6,
  maxTokens: 36_000,
};

export interface QaTestFileChange {
  path: string;
  traceRef: string;
  criterionIndex: number;
  given: string;
  when: string;
  then: string;
  content: string;
}

export interface QaGeneratedTest {
  traceRef: string;
  criterionIndex: number;
  path: string;
  given: string;
  when: string;
  then: string;
}

export interface QaTaskDiff {
  path: string;
  before: string;
  after: string;
}

export interface QaExecutionEvidence {
  branchName: string;
  commitId: string;
  changedPaths: string[];
  toolCallEvidenceRefs: string[];
  diffs: QaTaskDiff[];
}

export interface QaAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  executionSessionId: string;
  generatedTests: QaGeneratedTest[];
  executionEvidence: QaExecutionEvidence;
  generatedAt: string;
}

export interface CreateQaAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  executionSessionId: string;
  generatedTests: QaGeneratedTest[];
  executionEvidence: QaExecutionEvidence;
}

export interface CreateQaAgentOutputMetadata {
  generatedAt: Date;
}

const QA_AGENT_REQUIRED_TOOLS = [
  "repository.write_file",
  "git.create_branch",
  "git.commit",
] as const;

const IMPLEMENTATION_PATH_PREFIXES = ["src/", "lib/", "apps/", "packages/"] as const;

export function assertQaAgentToolsIncludeExecution(tools: readonly string[]): void {
  for (const tool of QA_AGENT_REQUIRED_TOOLS) {
    if (!tools.includes(tool)) {
      throw new Error(`QA Agent requires ${tool}`);
    }
  }

  for (const tool of tools) {
    if (!(QA_AGENT_ALLOWED_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("QA Agent tool is outside the allowed execution set");
    }
  }
}

export function buildQaAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = QA_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertQaAgentToolsIncludeExecution(QA_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: QA_AGENT_ROLE,
    workItemId,
    outputSchemaRef: QA_OUTPUT_SCHEMA_REF,
    allowedTools: [...QA_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

function normalizeLineageToken(lineageId: string): string {
  return lineageId
    .replace(/[^A-Za-z0-9]/gu, "")
    .slice(0, 8)
    .toLowerCase();
}

export function buildQaTestPath(workItem: WorkItem, criterionIndex: number): string {
  const lineageToken = normalizeLineageToken(workItem.lineageId);
  return `tests/acceptance/${lineageToken}-ac-${String(criterionIndex + 1)}.test.ts`;
}

export function buildAcceptanceCriterionTestContent(
  workItem: WorkItem,
  criterion: AcceptanceCriterion,
  criterionIndex: number,
  traceRef: string,
): string {
  return `import { describe, expect, it } from "vitest";

// Trace: ${traceRef}
describe("${workItem.title.trim()} acceptance criterion ${String(criterionIndex + 1)}", () => {
  it("Given ${criterion.given}, when ${criterion.when}, then ${criterion.then}", () => {
    expect(false).toBe(true);
  });
});
`;
}

export function assertQaTestPlanIsIndependentOfImplementation(plan: QaTestFileChange[]): void {
  for (const entry of plan) {
    if (IMPLEMENTATION_PATH_PREFIXES.some((prefix) => entry.path.startsWith(prefix))) {
      throw new Error("QA tests must not be written to implementation paths");
    }

    for (const prefix of IMPLEMENTATION_PATH_PREFIXES) {
      if (entry.content.includes(prefix)) {
        throw new Error("QA test content must not reference implementation paths");
      }
    }
  }
}

export function buildAcceptanceCriterionTestPlan(workItem: WorkItem): QaTestFileChange[] {
  if (workItem.acceptanceCriteria.length === 0) {
    throw new Error("Acceptance criteria are required for QA test generation");
  }

  const plan = workItem.acceptanceCriteria.map((criterion, index) => {
    const traceRef = buildAutomatedTestRef({
      workItemLineageId: workItem.lineageId,
      requirementSequence: 1,
      criterionSequence: index + 1,
    });

    return {
      path: buildQaTestPath(workItem, index),
      traceRef,
      criterionIndex: index,
      given: criterion.given,
      when: criterion.when,
      then: criterion.then,
      content: buildAcceptanceCriterionTestContent(workItem, criterion, index, traceRef),
    };
  });

  assertQaTestPlanIsIndependentOfImplementation(plan);

  return plan;
}

export function buildQaBranchName(workItem: WorkItem): string {
  return `qa/${workItem.id}`;
}

export function createQaAgentOutput(
  input: CreateQaAgentOutputInput,
  metadata: CreateQaAgentOutputMetadata,
): QaAgentOutput {
  const output: QaAgentOutput = {
    schemaRef: QA_OUTPUT_SCHEMA_REF,
    workItemId: input.workItemId.trim(),
    agentRunId: input.agentRunId.trim(),
    executionSessionId: input.executionSessionId.trim(),
    generatedTests: input.generatedTests,
    executionEvidence: input.executionEvidence,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateQaAgentOutput(output);

  return output;
}

export function validateQaAgentOutput(output: QaAgentOutput): void {
  if (output.schemaRef !== QA_OUTPUT_SCHEMA_REF) {
    throw new Error("QA output schema reference is invalid");
  }

  if (
    output.workItemId.length === 0 ||
    output.agentRunId.length === 0 ||
    output.executionSessionId.length === 0
  ) {
    throw new Error("QA output identifiers are required");
  }

  if (output.generatedAt.length === 0) {
    throw new Error("QA output timestamp is required");
  }

  if (output.generatedTests.length === 0) {
    throw new Error("QA generated tests are required");
  }

  for (const test of output.generatedTests) {
    if (test.traceRef.trim().length === 0 || test.path.trim().length === 0) {
      throw new Error("QA generated test fields are required");
    }
  }

  if (output.executionEvidence.branchName.trim().length === 0) {
    throw new Error("QA execution branch is required");
  }

  if (output.executionEvidence.commitId.trim().length === 0) {
    throw new Error("QA execution commit is required");
  }

  if (output.executionEvidence.changedPaths.length === 0) {
    throw new Error("QA execution changed paths are required");
  }
}
