import type {
  AgentRunBudget,
  AgentRunContextItem,
  AgentRunInputContract,
} from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import { DISCOVERY_AGENT_WRITE_TOOLS } from "./discovery-agent.js";
import type { DiscoveryAgentOutput } from "./discovery-agent.js";
import type { ExecutionEvidence } from "../execution/execution-evidence.js";
import type { FindingSeverity } from "../verification/finding.js";
import type { WorkItem } from "../intent/work-item.js";

export const SECURITY_AGENT_ROLE = "Security Agent";
export const SECURITY_OUTPUT_SCHEMA_REF = "schemas/security-output.schema.json";

export const SECURITY_AGENT_ALLOWED_TOOLS = ["repository.read_file", "repository.search"] as const;

export const SECURITY_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 20,
  maxCostUsd: 5,
  maxTokens: 28_000,
};

export interface SecurityThreat {
  id: string;
  title: string;
  scenario: string;
  affectedAssets: string[];
  severity: FindingSeverity;
}

export interface SecurityThreatModel {
  summary: string;
  threats: SecurityThreat[];
}

export interface SecurityReviewFindingProposal {
  id: string;
  title: string;
  severity: FindingSeverity;
  evidence: string;
  remediation: string;
  waivable: false;
}

export interface SecurityAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  discoveryRunId: string;
  executionEvidenceId: string;
  threatModel: SecurityThreatModel;
  reviewFindings: SecurityReviewFindingProposal[];
  raisedFindingIds: string[];
  generatedAt: string;
}

export interface BuildSecurityThreatModelInput {
  workItem: WorkItem;
  discoveryOutput: DiscoveryAgentOutput;
  executionEvidence: ExecutionEvidence;
  createId: () => string;
}

export interface BuildSecurityReviewFindingsInput {
  workItem: WorkItem;
  discoveryOutput: DiscoveryAgentOutput;
  executionEvidence: ExecutionEvidence;
  createId: () => string;
}

export interface CreateSecurityAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  discoveryRunId: string;
  executionEvidenceId: string;
  threatModel: SecurityThreatModel;
  reviewFindings: SecurityReviewFindingProposal[];
  raisedFindingIds: string[];
}

export interface CreateSecurityAgentOutputMetadata {
  generatedAt: Date;
}

const SENSITIVE_DATA_CLASSIFICATIONS = [
  "authentication",
  "personal",
  "financial",
  "health",
] as const;

const SECRET_PATTERN = /password|api[_-]?key|secret|token\s*=/iu;

export function assertSecurityAgentToolsAreReadOnly(tools: readonly string[]): void {
  for (const tool of tools) {
    if ((DISCOVERY_AGENT_WRITE_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("Security Agent cannot use write or execution tools");
    }
  }
}

export function buildSecurityAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = SECURITY_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertSecurityAgentToolsAreReadOnly(SECURITY_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: SECURITY_AGENT_ROLE,
    workItemId,
    outputSchemaRef: SECURITY_OUTPUT_SCHEMA_REF,
    allowedTools: [...SECURITY_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

function mapWorkItemRiskToThreatSeverity(workItem: WorkItem): FindingSeverity {
  if (workItem.riskLevel === "critical") {
    return "critical";
  }

  if (workItem.riskLevel === "high") {
    return "high";
  }

  return "medium";
}

export function buildSecurityThreatModel(
  input: BuildSecurityThreatModelInput,
): SecurityThreatModel {
  const affectedAssets =
    input.executionEvidence.changedPaths.length > 0
      ? input.executionEvidence.changedPaths
      : input.discoveryOutput.assessmentEvidence.seedFilePaths;

  const threats: SecurityThreat[] = [
    {
      id: input.createId(),
      title: "Cross-tenant data exposure",
      scenario: `Changes affecting ${input.workItem.affectedSystems.join(", ") || "application modules"} may expose tenant-scoped data.`,
      affectedAssets,
      severity: mapWorkItemRiskToThreatSeverity(input.workItem),
    },
  ];

  if (input.discoveryOutput.assessmentEvidence.containsPromptInjection) {
    threats.push({
      id: input.createId(),
      title: "Untrusted repository instruction injection",
      scenario:
        "Malicious repository context may attempt to alter agent behavior or policy enforcement.",
      affectedAssets: input.discoveryOutput.assessmentEvidence.seedFilePaths,
      severity: "critical",
    });
  }

  return {
    summary: `Reviewed ${String(affectedAssets.length)} changed assets for ${input.workItem.title.trim()}.`,
    threats,
  };
}

export function buildSecurityReviewFindings(
  input: BuildSecurityReviewFindingsInput,
): SecurityReviewFindingProposal[] {
  const proposals: SecurityReviewFindingProposal[] = [];

  if (input.discoveryOutput.assessmentEvidence.containsPromptInjection) {
    proposals.push({
      id: input.createId(),
      title: "Untrusted repository context detected",
      severity: "critical",
      evidence: `Discovery run ${input.discoveryOutput.agentRunId} flagged prompt injection patterns`,
      remediation: "Exclude untrusted repository context from agent runs and re-review changes",
      waivable: false,
    });
  }

  for (const diff of input.executionEvidence.diffs) {
    if (SECRET_PATTERN.test(diff.after)) {
      proposals.push({
        id: input.createId(),
        title: `Potential secret material in ${diff.path}`,
        severity: "high",
        evidence:
          input.executionEvidence.toolCallEvidenceRefs[0] ??
          `execution-evidence/${input.executionEvidence.id}`,
        remediation: "Remove secrets from source and rotate affected credentials",
        waivable: false,
      });
    }
  }

  if (
    (SENSITIVE_DATA_CLASSIFICATIONS as readonly string[]).includes(
      input.workItem.dataClassification,
    )
  ) {
    proposals.push({
      id: input.createId(),
      title: "Sensitive data classification requires tenant isolation review",
      severity: input.workItem.riskLevel === "critical" ? "critical" : "high",
      evidence: `Work item classification: ${input.workItem.dataClassification}`,
      remediation:
        "Verify tenant scoping, authorization checks, and audit coverage for changed paths",
      waivable: false,
    });
  }

  return proposals;
}

export function assertSecurityReviewFindingIsNotWaivable(proposal: { waivable: boolean }): void {
  if (proposal.waivable) {
    throw new Error("Security Agent findings cannot be waivable");
  }
}

export function createSecurityAgentOutput(
  input: CreateSecurityAgentOutputInput,
  metadata: CreateSecurityAgentOutputMetadata,
): SecurityAgentOutput {
  for (const proposal of input.reviewFindings) {
    assertSecurityReviewFindingIsNotWaivable(proposal);
  }

  const output: SecurityAgentOutput = {
    schemaRef: SECURITY_OUTPUT_SCHEMA_REF,
    workItemId: input.workItemId.trim(),
    agentRunId: input.agentRunId.trim(),
    discoveryRunId: input.discoveryRunId.trim(),
    executionEvidenceId: input.executionEvidenceId.trim(),
    threatModel: input.threatModel,
    reviewFindings: input.reviewFindings,
    raisedFindingIds: input.raisedFindingIds,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateSecurityAgentOutput(output);

  return output;
}

export function validateSecurityAgentOutput(output: SecurityAgentOutput): void {
  if (output.schemaRef !== SECURITY_OUTPUT_SCHEMA_REF) {
    throw new Error("Security output schema reference is invalid");
  }

  if (
    output.workItemId.length === 0 ||
    output.agentRunId.length === 0 ||
    output.discoveryRunId.length === 0 ||
    output.executionEvidenceId.length === 0
  ) {
    throw new Error("Security output identifiers are required");
  }

  if (output.generatedAt.length === 0) {
    throw new Error("Security output timestamp is required");
  }

  if (output.threatModel.summary.trim().length === 0 || output.threatModel.threats.length === 0) {
    throw new Error("Security threat model is required");
  }

  for (const proposal of output.reviewFindings) {
    assertSecurityReviewFindingIsNotWaivable(proposal);
  }
}
