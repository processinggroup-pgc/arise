export const FINDING_CATEGORIES = [
  "security",
  "quality",
  "architecture",
  "test",
  "policy",
] as const;

export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export const FINDING_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const FINDING_STATUSES = [
  "open",
  "in_remediation",
  "resolved",
  "waived",
  "false_positive",
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export interface Finding {
  id: string;
  organizationId: string;
  workItemId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  evidence: string;
  remediation: string;
  status: FindingStatus;
  raisedAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface CreateFindingInput {
  organizationId: string;
  workItemId: string;
  category: string;
  severity: string;
  title: string;
  evidence: string;
  remediation: string;
}

export interface CreateFindingMetadata {
  id: string;
  raisedAt: Date;
}

function assertFindingCategory(category: string): FindingCategory {
  if (!(FINDING_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Finding category is invalid");
  }

  return category as FindingCategory;
}

function assertFindingSeverity(severity: string): FindingSeverity {
  if (!(FINDING_SEVERITIES as readonly string[]).includes(severity)) {
    throw new Error("Finding severity is invalid");
  }

  return severity as FindingSeverity;
}

export function createFinding(input: CreateFindingInput, metadata: CreateFindingMetadata): Finding {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();
  const title = input.title.trim();
  const evidence = input.evidence.trim();
  const remediation = input.remediation.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Finding identifiers are required");
  }

  if (title.length === 0 || evidence.length === 0 || remediation.length === 0) {
    throw new Error("Finding fields are required");
  }

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    category: assertFindingCategory(input.category.trim()),
    severity: assertFindingSeverity(input.severity.trim()),
    title,
    evidence,
    remediation,
    status: "open",
    raisedAt: metadata.raisedAt,
    updatedAt: metadata.raisedAt,
  };
}

export function isFindingOpen(finding: Finding): boolean {
  return finding.status === "open" || finding.status === "in_remediation";
}

export function isReleaseBlockingFinding(finding: Finding): boolean {
  if (!isFindingOpen(finding)) {
    return false;
  }

  if (finding.category === "security" && finding.severity === "critical") {
    return true;
  }

  return finding.severity === "critical" || finding.severity === "high";
}

export function evaluateReleaseBlockingFindings(findings: Finding[]): Finding[] {
  return findings.filter(isReleaseBlockingFinding);
}
