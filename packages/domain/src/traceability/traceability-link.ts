import {
  EXPLICIT_TRACEABILITY_RELATIONSHIPS,
  TRACEABILITY_SUBJECT_TYPES,
  type ExplicitTraceabilityRelationship,
  type TraceabilitySubjectType,
} from "./traceability-types.js";

export interface TraceabilityLink {
  id: string;
  organizationId: string;
  workItemLineageId: string;
  sourceType: TraceabilitySubjectType;
  sourceId: string;
  targetType: TraceabilitySubjectType;
  targetId: string;
  relationship: ExplicitTraceabilityRelationship;
  createdAt: Date;
}

export interface CreateTraceabilityLinkInput {
  organizationId: string;
  workItemLineageId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationship: string;
}

export interface CreateTraceabilityLinkMetadata {
  id: string;
  createdAt: Date;
}

function assertTraceabilitySubjectType(subjectType: string): TraceabilitySubjectType {
  if (!(TRACEABILITY_SUBJECT_TYPES as readonly string[]).includes(subjectType)) {
    throw new Error("Traceability subject type is invalid");
  }

  return subjectType as TraceabilitySubjectType;
}

function assertExplicitTraceabilityRelationship(
  relationship: string,
): ExplicitTraceabilityRelationship {
  if (!(EXPLICIT_TRACEABILITY_RELATIONSHIPS as readonly string[]).includes(relationship)) {
    throw new Error("Traceability relationship is invalid");
  }

  return relationship as ExplicitTraceabilityRelationship;
}

export function createTraceabilityLink(
  input: CreateTraceabilityLinkInput,
  metadata: CreateTraceabilityLinkMetadata,
): TraceabilityLink {
  const organizationId = input.organizationId.trim();
  const workItemLineageId = input.workItemLineageId.trim();
  const sourceId = input.sourceId.trim();
  const targetId = input.targetId.trim();
  const sourceType = assertTraceabilitySubjectType(input.sourceType);
  const targetType = assertTraceabilitySubjectType(input.targetType);
  const relationship = assertExplicitTraceabilityRelationship(input.relationship);

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (workItemLineageId.length === 0) {
    throw new Error("Work item lineage identifier is required");
  }

  if (sourceId.length === 0 || targetId.length === 0) {
    throw new Error("Traceability link endpoints are required");
  }

  if (sourceType === targetType && sourceId === targetId) {
    throw new Error("Traceability link source and target must differ");
  }

  return {
    id: metadata.id,
    organizationId,
    workItemLineageId,
    sourceType,
    sourceId,
    targetType,
    targetId,
    relationship,
    createdAt: metadata.createdAt,
  };
}
