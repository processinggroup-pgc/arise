import type { AgentRunBudget, AgentRunContextItem, AgentRunInputContract } from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import { DISCOVERY_AGENT_WRITE_TOOLS } from "./discovery-agent.js";
import type { DiscoveryAgentOutput } from "./discovery-agent.js";
import type { WorkItem, WorkItemRiskLevel } from "../intent/work-item.js";

export const ARCHITECTURE_AGENT_ROLE = "Architecture Agent";
export const ARCHITECTURE_OUTPUT_SCHEMA_REF = "schemas/architecture-output.schema.json";

export const ARCHITECTURE_AGENT_ALLOWED_TOOLS = [
  "repository.read_file",
  "repository.search",
] as const;

export const ARCHITECTURE_DECISION_STATUSES = ["draft"] as const;
export type ArchitectureDecisionStatus = (typeof ARCHITECTURE_DECISION_STATUSES)[number];

export const ARCHITECTURE_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 20,
  maxCostUsd: 4,
  maxTokens: 24_000,
};

export interface ArchitectureOption {
  id: string;
  title: string;
  summary: string;
  tradeoffs: string[];
  affectedPaths: string[];
  riskLevel: WorkItemRiskLevel;
}

export interface ArchitectureDecisionRecordDraft {
  title: string;
  context: string;
  decision: string;
  status: ArchitectureDecisionStatus;
  consequences: string[];
  openQuestions: string[];
}

export interface ArchitectureAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  discoveryRunId: string;
  options: ArchitectureOption[];
  preferredOptionId: string;
  decisionRecord: ArchitectureDecisionRecordDraft;
  generatedAt: string;
}

export interface BuildArchitectureOptionsInput {
  workItem: WorkItem;
  discoveryOutput: DiscoveryAgentOutput;
  createId: () => string;
}

export interface BuildArchitectureDecisionRecordInput {
  workItem: WorkItem;
  preferredOption: ArchitectureOption;
  discoveryOutput: DiscoveryAgentOutput;
}

export interface CreateArchitectureAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  discoveryRunId: string;
  options: ArchitectureOption[];
  preferredOptionId: string;
  decisionRecord: ArchitectureDecisionRecordDraft;
}

export interface CreateArchitectureAgentOutputMetadata {
  generatedAt: Date;
}

export function assertArchitectureAgentToolsAreReadOnly(tools: readonly string[]): void {
  for (const tool of tools) {
    if ((DISCOVERY_AGENT_WRITE_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("Architecture Agent cannot use write or execution tools");
    }
  }
}

export function buildArchitectureAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = ARCHITECTURE_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertArchitectureAgentToolsAreReadOnly(ARCHITECTURE_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: ARCHITECTURE_AGENT_ROLE,
    workItemId,
    outputSchemaRef: ARCHITECTURE_OUTPUT_SCHEMA_REF,
    allowedTools: [...ARCHITECTURE_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

function collectRelevantPaths(discoveryOutput: DiscoveryAgentOutput): string[] {
  const paths = new Set<string>(discoveryOutput.assessmentEvidence.seedFilePaths);

  for (const seedPath of discoveryOutput.assessmentEvidence.seedFilePaths) {
    const directoryIndex = seedPath.lastIndexOf("/");
    const directory = directoryIndex === -1 ? "" : seedPath.slice(0, directoryIndex);

    for (const file of discoveryOutput.repositoryMap.files) {
      if (directory.length === 0 || file.path.startsWith(`${directory}/`) || file.path === seedPath) {
        paths.add(file.path);
      }
    }
  }

  return [...paths].sort((left, right) => left.localeCompare(right));
}

export function buildArchitectureOptions(input: BuildArchitectureOptionsInput): ArchitectureOption[] {
  const affectedPaths = collectRelevantPaths(input.discoveryOutput);
  const dependencyCount = input.discoveryOutput.repositoryMap.dependencyCount;
  const options: ArchitectureOption[] = [
    {
      id: input.createId(),
      title: "Extend existing modules",
      summary: `Evolve modules near ${affectedPaths[0] ?? "the repository entrypoint"} to deliver ${input.workItem.title.trim()}.`,
      tradeoffs: [
        "Lower integration cost by reusing existing patterns",
        "Changes may increase coupling in already dense modules",
      ],
      affectedPaths,
      riskLevel: input.workItem.riskLevel,
    },
    {
      id: input.createId(),
      title: "Introduce a boundary module",
      summary: `Add a dedicated boundary around ${input.workItem.title.trim()} with explicit interfaces and tests.`,
      tradeoffs: [
        "Improves isolation and reviewability for higher-risk changes",
        "Requires additional wiring and migration effort",
      ],
      affectedPaths,
      riskLevel: input.workItem.riskLevel === "low" ? "medium" : input.workItem.riskLevel,
    },
  ];

  if (input.workItem.type === "spike" || input.workItem.unresolvedQuestions.length > 0) {
    options.push({
      id: input.createId(),
      title: "Time-boxed spike",
      summary: `Validate unknowns for ${input.workItem.title.trim()} before committing to production structure.`,
      tradeoffs: [
        "Reduces architecture risk when requirements are still uncertain",
        "Spike code must not ship without follow-up hardening",
      ],
      affectedPaths,
      riskLevel: "low",
    });
  }

  if (dependencyCount > 10) {
    options.push({
      id: input.createId(),
      title: "Staged adapter rollout",
      summary: "Introduce adapters at dependency hotspots and migrate callers incrementally.",
      tradeoffs: [
        "Limits blast radius across densely connected code",
        "Adds temporary duplication until migration completes",
      ],
      affectedPaths,
      riskLevel: input.workItem.riskLevel,
    });
  }

  return options;
}

export function selectPreferredArchitectureOption(
  options: ArchitectureOption[],
  workItem: WorkItem,
): ArchitectureOption {
  if (options.length === 0) {
    throw new Error("Architecture options are required");
  }

  const spikeOption = options.find((option) => option.title === "Time-boxed spike");
  if (workItem.type === "spike" && spikeOption !== undefined) {
    return spikeOption;
  }

  const boundaryOption = options.find((option) => option.title === "Introduce a boundary module");
  if (
    (workItem.riskLevel === "high" || workItem.riskLevel === "critical") &&
    boundaryOption !== undefined
  ) {
    return boundaryOption;
  }

  const adapterOption = options.find((option) => option.title === "Staged adapter rollout");
  if (
    workItem.riskLevel === "critical" &&
    adapterOption !== undefined &&
    workItem.affectedSystems.length > 1
  ) {
    return adapterOption;
  }

  const extendOption = options.find((option) => option.title === "Extend existing modules");
  if (extendOption !== undefined) {
    return extendOption;
  }

  throw new Error("Architecture options are required");
}

export function buildArchitectureDecisionRecordDraft(
  input: BuildArchitectureDecisionRecordInput,
): ArchitectureDecisionRecordDraft {
  const openQuestions = input.workItem.unresolvedQuestions.map((question) => question.question);
  if (input.discoveryOutput.assessmentEvidence.containsPromptInjection) {
    openQuestions.push("How should untrusted repository context be excluded from future runs?");
  }

  return {
    title: `${input.workItem.title.trim()} architecture decision`,
    context: [
      input.workItem.problemStatement.trim(),
      `Discovery evidence: ${input.discoveryOutput.assessmentEvidence.summary}`,
    ].join(" "),
    decision: input.preferredOption.summary,
    status: "draft",
    consequences: [
      ...input.preferredOption.tradeoffs,
      `Preferred approach risk level: ${input.preferredOption.riskLevel}`,
    ],
    openQuestions,
  };
}

export function createArchitectureAgentOutput(
  input: CreateArchitectureAgentOutputInput,
  metadata: CreateArchitectureAgentOutputMetadata,
): ArchitectureAgentOutput {
  const output: ArchitectureAgentOutput = {
    schemaRef: ARCHITECTURE_OUTPUT_SCHEMA_REF,
    workItemId: input.workItemId.trim(),
    agentRunId: input.agentRunId.trim(),
    discoveryRunId: input.discoveryRunId.trim(),
    options: input.options,
    preferredOptionId: input.preferredOptionId.trim(),
    decisionRecord: input.decisionRecord,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateArchitectureAgentOutput(output);

  return output;
}

export function validateArchitectureAgentOutput(output: ArchitectureAgentOutput): void {
  if (output.schemaRef !== ARCHITECTURE_OUTPUT_SCHEMA_REF) {
    throw new Error("Architecture output schema reference is invalid");
  }

  if (
    output.workItemId.length === 0 ||
    output.agentRunId.length === 0 ||
    output.discoveryRunId.length === 0
  ) {
    throw new Error("Architecture output identifiers are required");
  }

  if (output.generatedAt.length === 0) {
    throw new Error("Architecture output timestamp is required");
  }

  if (output.options.length < 2) {
    throw new Error("Architecture options must include at least two alternatives");
  }

  const optionIds = new Set(output.options.map((option) => option.id));
  if (!optionIds.has(output.preferredOptionId)) {
    throw new Error("Preferred architecture option must reference a generated option");
  }

  for (const option of output.options) {
    if (option.title.trim().length === 0 || option.summary.trim().length === 0) {
      throw new Error("Architecture option fields are required");
    }

    if (option.tradeoffs.length === 0) {
      throw new Error("Architecture option tradeoffs are required");
    }
  }

  if (output.decisionRecord.title.trim().length === 0) {
    throw new Error("Architecture decision record title is required");
  }

  if (output.decisionRecord.context.trim().length === 0) {
    throw new Error("Architecture decision record context is required");
  }

  if (output.decisionRecord.decision.trim().length === 0) {
    throw new Error("Architecture decision record decision is required");
  }
}
