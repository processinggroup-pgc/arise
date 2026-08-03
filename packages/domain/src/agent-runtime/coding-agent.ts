import type { AgentRunBudget, AgentRunContextItem, AgentRunInputContract } from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import type { ArchitectureAgentOutput } from "./architecture-agent.js";
import { REPOSITORY_GIT_TOOL_NAMES } from "../execution/repository-git-tools.js";
import type { WorkItem } from "../intent/work-item.js";

export const CODING_AGENT_ROLE = "Coding Agent";
export const CODING_OUTPUT_SCHEMA_REF = "schemas/coding-output.schema.json";

export const CODING_AGENT_ALLOWED_TOOLS = [...REPOSITORY_GIT_TOOL_NAMES] as const;

export const CODING_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 30,
  maxCostUsd: 8,
  maxTokens: 48_000,
};

export const CODING_TASK_PHASES = ["test", "implementation"] as const;
export type CodingTaskPhase = (typeof CODING_TASK_PHASES)[number];

export interface CodingTask {
  id: string;
  title: string;
  description: string;
  targetPaths: string[];
  branchName: string;
}

export interface CodingTaskFileChange {
  path: string;
  content: string;
  phase: CodingTaskPhase;
}

export interface CodingTaskDiff {
  path: string;
  before: string;
  after: string;
}

export interface CodingExecutionEvidence {
  branchName: string;
  commitId: string;
  changedPaths: string[];
  toolCallEvidenceRefs: string[];
  diffs: CodingTaskDiff[];
}

export interface CodingAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  architectureRunId: string;
  executionSessionId: string;
  task: CodingTask;
  executionEvidence: CodingExecutionEvidence;
  generatedAt: string;
}

export interface BuildCodingTaskFromArchitectureInput {
  workItem: WorkItem;
  architectureOutput: ArchitectureAgentOutput;
  createId: () => string;
}

export interface CreateCodingAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  architectureRunId: string;
  executionSessionId: string;
  task: CodingTask;
  executionEvidence: CodingExecutionEvidence;
}

export interface CreateCodingAgentOutputMetadata {
  generatedAt: Date;
}

const CODING_AGENT_REQUIRED_TOOLS = [
  "repository.write_file",
  "git.create_branch",
  "git.commit",
] as const;

export function assertCodingAgentToolsIncludeExecution(tools: readonly string[]): void {
  for (const tool of CODING_AGENT_REQUIRED_TOOLS) {
    if (!tools.includes(tool)) {
      throw new Error(`Coding Agent requires ${tool}`);
    }
  }

  for (const tool of tools) {
    if (!(CODING_AGENT_ALLOWED_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("Coding Agent tool is outside the allowed execution set");
    }
  }
}

export function buildCodingAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = CODING_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertCodingAgentToolsIncludeExecution(CODING_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: CODING_AGENT_ROLE,
    workItemId,
    outputSchemaRef: CODING_OUTPUT_SCHEMA_REF,
    allowedTools: [...CODING_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

function deriveTestPath(sourcePath: string): string {
  const lastDot = sourcePath.lastIndexOf(".");
  if (lastDot === -1) {
    return `${sourcePath}.test.ts`;
  }

  return `${sourcePath.slice(0, lastDot)}.test${sourcePath.slice(lastDot)}`;
}

export function buildCodingTaskFromArchitecture(
  input: BuildCodingTaskFromArchitectureInput,
): CodingTask {
  const preferredOption = input.architectureOutput.options.find(
    (option) => option.id === input.architectureOutput.preferredOptionId,
  );
  if (preferredOption === undefined) {
    throw new Error("Preferred architecture option was not found");
  }

  const primaryPath = preferredOption.affectedPaths[0] ?? "src/index.ts";
  const testPath = deriveTestPath(primaryPath);

  return {
    id: input.createId(),
    title: `Implement ${input.workItem.title.trim()}`,
    description: preferredOption.summary,
    targetPaths: [testPath, primaryPath],
    branchName: `feature/${input.workItem.id}`,
  };
}

function buildFailingTestContent(workItem: WorkItem): string {
  const behavior = workItem.desiredBehavior.trim();
  return `import { describe, expect, it } from "vitest";

describe("${workItem.title.trim()}", () => {
  it("should satisfy acceptance criteria", () => {
    expect(false).toBe(true); // TODO: ${behavior}
  });
});
`;
}

function buildImplementationContent(
  path: string,
  task: CodingTask,
  existingContent: string,
): string {
  if (existingContent.length > 0) {
    return `${existingContent}\n// ${task.description}\n`;
  }

  return `// ${task.description}\nexport function ${path.split("/").pop()?.replace(/\..+/u, "") ?? "handler"}() {}\n`;
}

function isTestPath(path: string): boolean {
  return path.includes(".test.") || path.endsWith(".spec.ts");
}

export function buildCodingTaskImplementationPlan(
  task: CodingTask,
  workItem: WorkItem,
  existingFiles: Record<string, string>,
): CodingTaskFileChange[] {
  const changes: CodingTaskFileChange[] = [];

  for (const path of task.targetPaths) {
    const existingContent = existingFiles[path] ?? "";

    if (isTestPath(path)) {
      changes.push({
        path,
        phase: "test",
        content: buildFailingTestContent(workItem),
      });
      continue;
    }

    changes.push({
      path,
      phase: "implementation",
      content: buildImplementationContent(path, task, existingContent),
    });
  }

  return changes.sort((left, right) => {
    if (left.phase === "test" && right.phase === "implementation") {
      return -1;
    }

    if (left.phase === "implementation" && right.phase === "test") {
      return 1;
    }

    return left.path.localeCompare(right.path);
  });
}

export function createCodingAgentOutput(
  input: CreateCodingAgentOutputInput,
  metadata: CreateCodingAgentOutputMetadata,
): CodingAgentOutput {
  const output: CodingAgentOutput = {
    schemaRef: CODING_OUTPUT_SCHEMA_REF,
    workItemId: input.workItemId.trim(),
    agentRunId: input.agentRunId.trim(),
    architectureRunId: input.architectureRunId.trim(),
    executionSessionId: input.executionSessionId.trim(),
    task: input.task,
    executionEvidence: input.executionEvidence,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateCodingAgentOutput(output);

  return output;
}

export function validateCodingAgentOutput(output: CodingAgentOutput): void {
  if (output.schemaRef !== CODING_OUTPUT_SCHEMA_REF) {
    throw new Error("Coding output schema reference is invalid");
  }

  if (
    output.workItemId.length === 0 ||
    output.agentRunId.length === 0 ||
    output.architectureRunId.length === 0 ||
    output.executionSessionId.length === 0
  ) {
    throw new Error("Coding output identifiers are required");
  }

  if (output.generatedAt.length === 0) {
    throw new Error("Coding output timestamp is required");
  }

  if (output.task.id.trim().length === 0 || output.task.title.trim().length === 0) {
    throw new Error("Coding task fields are required");
  }

  if (output.task.targetPaths.length === 0) {
    throw new Error("Coding task target paths are required");
  }

  if (output.executionEvidence.branchName.trim().length === 0) {
    throw new Error("Coding execution branch is required");
  }

  if (output.executionEvidence.commitId.trim().length === 0) {
    throw new Error("Coding execution commit is required");
  }

  if (output.executionEvidence.changedPaths.length === 0) {
    throw new Error("Coding execution changed paths are required");
  }
}
