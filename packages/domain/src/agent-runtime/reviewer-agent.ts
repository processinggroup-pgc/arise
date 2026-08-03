import type {
  AgentRunBudget,
  AgentRunContextItem,
  AgentRunInputContract,
} from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import { DISCOVERY_AGENT_WRITE_TOOLS } from "./discovery-agent.js";
import type { ExecutionEvidence } from "../execution/execution-evidence.js";
import type { WorkItem } from "../intent/work-item.js";

export const REVIEWER_AGENT_ROLE = "Reviewer Agent";
export const REVIEWER_OUTPUT_SCHEMA_REF = "schemas/reviewer-output.schema.json";

export const REVIEWER_AGENT_ALLOWED_TOOLS = ["repository.read_file", "repository.search"] as const;

export const REVIEWER_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 20,
  maxCostUsd: 4,
  maxTokens: 24_000,
};

export const REVIEW_VERDICTS = ["approved", "changes_requested"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const REVIEW_FINDING_CATEGORIES = ["requirement", "constitution", "quality"] as const;
export type ReviewFindingCategory = (typeof REVIEW_FINDING_CATEGORIES)[number];

export interface PlatformConstitution {
  secretsInSourceBlocked: boolean;
  changedBehaviorRequiresLinkedTest: boolean;
  tddRequired: boolean;
  directDatabaseAccessFromUiBlocked: boolean;
}

export const DEFAULT_PLATFORM_CONSTITUTION: PlatformConstitution = {
  secretsInSourceBlocked: true,
  changedBehaviorRequiresLinkedTest: true,
  tddRequired: true,
  directDatabaseAccessFromUiBlocked: true,
};

export interface RequirementCoverageItem {
  criterionIndex: number;
  given: string;
  when: string;
  then: string;
  status: "covered" | "partial" | "missing";
  evidence: string;
}

export interface ReviewFinding {
  id: string;
  category: ReviewFindingCategory;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  evidence: string;
  remediation: string;
  blocking: boolean;
}

export interface ReviewerAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  codingRunId: string;
  executionEvidenceId: string;
  architectureRunId: string;
  verdict: ReviewVerdict;
  summary: string;
  requirementCoverage: RequirementCoverageItem[];
  findings: ReviewFinding[];
  raisedFindingIds: string[];
  generatedAt: string;
}

export interface BuildConstitutionReviewFindingsInput {
  workItem: WorkItem;
  executionEvidence: ExecutionEvidence;
  constitution: PlatformConstitution;
  createId: () => string;
}

export interface CreateReviewerAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  codingRunId: string;
  executionEvidenceId: string;
  architectureRunId: string;
  verdict: ReviewVerdict;
  summary: string;
  requirementCoverage: RequirementCoverageItem[];
  findings: ReviewFinding[];
  raisedFindingIds: string[];
}

export interface CreateReviewerAgentOutputMetadata {
  generatedAt: Date;
}

const SECRET_PATTERN = /password|api[_-]?key|secret|token\s*=/iu;
const IMPLEMENTATION_PATH_PATTERN = /^(src|lib|apps|packages)\//u;
const TEST_PATH_PATTERN = /\.(test|spec)\.[jt]sx?$/u;
const DIRECT_DATABASE_ACCESS_PATTERN = /supabase\.from\(|prisma\.|createClient\(/u;

export function assertReviewerAgentToolsAreReadOnly(tools: readonly string[]): void {
  for (const tool of tools) {
    if ((DISCOVERY_AGENT_WRITE_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("Reviewer Agent cannot use write or execution tools");
    }
  }
}

export function buildReviewerAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = REVIEWER_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertReviewerAgentToolsAreReadOnly(REVIEWER_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: REVIEWER_AGENT_ROLE,
    workItemId,
    outputSchemaRef: REVIEWER_OUTPUT_SCHEMA_REF,
    allowedTools: [...REVIEWER_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

function hasImplementationChanges(changedPaths: string[]): boolean {
  return changedPaths.some((path) => IMPLEMENTATION_PATH_PATTERN.test(path));
}

function hasLinkedTestChanges(changedPaths: string[]): boolean {
  return changedPaths.some((path) => TEST_PATH_PATTERN.test(path));
}

export function buildRequirementCoverageReview(
  workItem: WorkItem,
  executionEvidence: ExecutionEvidence,
): RequirementCoverageItem[] {
  const hasImplementation = hasImplementationChanges(executionEvidence.changedPaths);
  const hasTests = hasLinkedTestChanges(executionEvidence.changedPaths);

  return workItem.acceptanceCriteria.map((criterion, criterionIndex) => {
    let status: RequirementCoverageItem["status"] = "missing";
    let evidence = "No implementation or test evidence found for this criterion";

    if (hasImplementation && hasTests) {
      status = "covered";
      evidence = `Changed paths include implementation and linked tests: ${executionEvidence.changedPaths.join(", ")}`;
    } else if (hasImplementation) {
      status = "partial";
      evidence = `Implementation changed without linked test updates: ${executionEvidence.changedPaths.join(", ")}`;
    }

    return {
      criterionIndex,
      given: criterion.given,
      when: criterion.when,
      then: criterion.then,
      status,
      evidence,
    };
  });
}

export function buildConstitutionReviewFindings(
  input: BuildConstitutionReviewFindingsInput,
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const { executionEvidence, constitution } = input;

  if (constitution.secretsInSourceBlocked) {
    for (const diff of executionEvidence.diffs) {
      if (SECRET_PATTERN.test(diff.after)) {
        findings.push({
          id: input.createId(),
          category: "constitution",
          severity: "critical",
          title: `Constitution violation: secret material in ${diff.path}`,
          evidence:
            executionEvidence.toolCallEvidenceRefs[0] ??
            `execution-evidence/${executionEvidence.id}`,
          remediation: "Remove secrets from source and rotate affected credentials",
          blocking: true,
        });
      }
    }
  }

  if (
    constitution.changedBehaviorRequiresLinkedTest &&
    hasImplementationChanges(executionEvidence.changedPaths) &&
    !hasLinkedTestChanges(executionEvidence.changedPaths)
  ) {
    findings.push({
      id: input.createId(),
      category: "constitution",
      severity: "high",
      title: "Constitution violation: changed behavior requires linked test",
      evidence: `Changed paths: ${executionEvidence.changedPaths.join(", ")}`,
      remediation: "Add or update tests that trace to the affected acceptance criteria",
      blocking: true,
    });
  }

  if (constitution.directDatabaseAccessFromUiBlocked) {
    for (const diff of executionEvidence.diffs) {
      if (
        /^(apps|src)\/.*/u.test(diff.path) &&
        (DIRECT_DATABASE_ACCESS_PATTERN.test(diff.after) ||
          DIRECT_DATABASE_ACCESS_PATTERN.test(diff.before))
      ) {
        findings.push({
          id: input.createId(),
          category: "constitution",
          severity: "high",
          title: `Constitution violation: direct database access in ${diff.path}`,
          evidence: diff.path,
          remediation: "Route database access through application services instead of UI layers",
          blocking: true,
        });
      }
    }
  }

  return findings;
}

export function buildQualityReviewFindings(input: {
  workItem: WorkItem;
  executionEvidence: ExecutionEvidence;
  createId: () => string;
}): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  if (input.workItem.acceptanceCriteria.length === 0) {
    findings.push({
      id: input.createId(),
      category: "quality",
      severity: "medium",
      title: "Work item lacks acceptance criteria for review",
      evidence: `Work item ${input.workItem.id}`,
      remediation: "Add acceptance criteria before requesting final review",
      blocking: true,
    });
  }

  if (input.executionEvidence.changedPaths.length > 5) {
    findings.push({
      id: input.createId(),
      category: "quality",
      severity: "medium",
      title: "Large change set requires additional review focus",
      evidence: `${String(input.executionEvidence.changedPaths.length)} paths changed`,
      remediation: "Split the work item or provide a focused review checklist",
      blocking: false,
    });
  }

  return findings;
}

export function determineReviewVerdict(
  requirementCoverage: RequirementCoverageItem[],
  findings: ReviewFinding[],
  qualityFindings: ReviewFinding[],
): ReviewVerdict {
  const combinedFindings = [...findings, ...qualityFindings];

  if (combinedFindings.some((finding) => finding.blocking)) {
    return "changes_requested";
  }

  if (requirementCoverage.some((item) => item.status !== "covered")) {
    return "changes_requested";
  }

  return "approved";
}

export function mapReviewFindingToFindingCategory(
  finding: ReviewFinding,
): "quality" | "architecture" | "test" | "policy" {
  if (finding.category === "requirement") {
    return "test";
  }

  if (finding.category === "constitution") {
    return "policy";
  }

  return "quality";
}

export function createReviewerAgentOutput(
  input: CreateReviewerAgentOutputInput,
  metadata: CreateReviewerAgentOutputMetadata,
): ReviewerAgentOutput {
  const output: ReviewerAgentOutput = {
    schemaRef: REVIEWER_OUTPUT_SCHEMA_REF,
    workItemId: input.workItemId.trim(),
    agentRunId: input.agentRunId.trim(),
    codingRunId: input.codingRunId.trim(),
    executionEvidenceId: input.executionEvidenceId.trim(),
    architectureRunId: input.architectureRunId.trim(),
    verdict: input.verdict,
    summary: input.summary.trim(),
    requirementCoverage: input.requirementCoverage,
    findings: input.findings,
    raisedFindingIds: input.raisedFindingIds,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateReviewerAgentOutput(output);

  return output;
}

export function validateReviewerAgentOutput(output: ReviewerAgentOutput): void {
  if (output.schemaRef !== REVIEWER_OUTPUT_SCHEMA_REF) {
    throw new Error("Reviewer output schema reference is invalid");
  }

  if (
    output.workItemId.length === 0 ||
    output.agentRunId.length === 0 ||
    output.codingRunId.length === 0 ||
    output.executionEvidenceId.length === 0 ||
    output.architectureRunId.length === 0
  ) {
    throw new Error("Reviewer output identifiers are required");
  }

  if (output.summary.length === 0 || output.generatedAt.length === 0) {
    throw new Error("Reviewer output summary and timestamp are required");
  }

  if (!(REVIEW_VERDICTS as readonly string[]).includes(output.verdict)) {
    throw new Error("Reviewer verdict is invalid");
  }
}
