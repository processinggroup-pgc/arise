export const REQUIREMENT_KINDS = [
  "functional",
  "non_functional",
  "constraint",
  "security",
] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

export const REQUIREMENT_PRIORITIES = ["must", "should", "could"] as const;
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

export const REQUIREMENT_SOURCES = ["stakeholder", "discovery", "policy", "assessment"] as const;
export type RequirementSource = (typeof REQUIREMENT_SOURCES)[number];

export const REQUIREMENT_STATUSES = ["draft", "active", "superseded"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export interface Requirement {
  id: string;
  workItemLineageId: string;
  organizationId: string;
  kind: RequirementKind;
  statement: string;
  priority: RequirementPriority;
  source: RequirementSource;
  status: RequirementStatus;
  createdAt: Date;
}

export interface CreateRequirementInput {
  workItemLineageId: string;
  organizationId: string;
  kind: string;
  statement: string;
  priority: string;
  source: string;
  status?: string;
}

export interface CreateRequirementMetadata {
  id: string;
  createdAt: Date;
}

function assertRequirementKind(kind: string): RequirementKind {
  if (!(REQUIREMENT_KINDS as readonly string[]).includes(kind)) {
    throw new Error("Requirement kind is invalid");
  }

  return kind as RequirementKind;
}

function assertRequirementPriority(priority: string): RequirementPriority {
  if (!(REQUIREMENT_PRIORITIES as readonly string[]).includes(priority)) {
    throw new Error("Requirement priority is invalid");
  }

  return priority as RequirementPriority;
}

function assertRequirementSource(source: string): RequirementSource {
  if (!(REQUIREMENT_SOURCES as readonly string[]).includes(source)) {
    throw new Error("Requirement source is invalid");
  }

  return source as RequirementSource;
}

function assertRequirementStatus(status: string): RequirementStatus {
  if (!(REQUIREMENT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Requirement status is invalid");
  }

  return status as RequirementStatus;
}

export function createRequirement(
  input: CreateRequirementInput,
  metadata: CreateRequirementMetadata,
): Requirement {
  const workItemLineageId = input.workItemLineageId.trim();
  const organizationId = input.organizationId.trim();
  const statement = input.statement.trim();

  if (workItemLineageId.length === 0) {
    throw new Error("Work item lineage identifier is required");
  }

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (statement.length < 10) {
    throw new Error("Requirement statement is required");
  }

  return {
    id: metadata.id,
    workItemLineageId,
    organizationId,
    kind: assertRequirementKind(input.kind),
    statement,
    priority: assertRequirementPriority(input.priority),
    source: assertRequirementSource(input.source),
    status: assertRequirementStatus(input.status ?? "draft"),
    createdAt: metadata.createdAt,
  };
}
