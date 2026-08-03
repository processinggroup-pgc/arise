export const TRACEABILITY_NODE_TYPES = [
  "work_item",
  "requirement",
  "acceptance_criterion",
  "automated_test",
  "code_artifact",
  "evidence",
] as const;

export type TraceabilityNodeType = (typeof TRACEABILITY_NODE_TYPES)[number];

export const TRACEABILITY_RELATIONSHIPS = [
  "scopes",
  "specifies",
  "traces_to",
  "implements",
  "evidences",
] as const;

export type TraceabilityRelationship = (typeof TRACEABILITY_RELATIONSHIPS)[number];

export const TRACEABILITY_SUBJECT_TYPES = TRACEABILITY_NODE_TYPES;
export type TraceabilitySubjectType = TraceabilityNodeType;

export const EXPLICIT_TRACEABILITY_RELATIONSHIPS = [
  "implements",
  "evidences",
  "validates",
] as const;

export type ExplicitTraceabilityRelationship = (typeof EXPLICIT_TRACEABILITY_RELATIONSHIPS)[number];

export interface TraceabilityNode {
  id: string;
  organizationId: string;
  nodeType: TraceabilityNodeType;
  entityId: string;
  label: string;
}

export interface TraceabilityEdge {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: TraceabilityRelationship;
}

export interface TraceabilityGraph {
  organizationId: string;
  workItemLineageId: string;
  nodes: TraceabilityNode[];
  edges: TraceabilityEdge[];
}

export function buildTraceabilityNodeId(nodeType: TraceabilityNodeType, entityId: string): string {
  return `${nodeType}:${entityId}`;
}

function assertTraceabilityNodeType(nodeType: string): TraceabilityNodeType {
  if (!(TRACEABILITY_NODE_TYPES as readonly string[]).includes(nodeType)) {
    throw new Error("Traceability node type is invalid");
  }

  return nodeType as TraceabilityNodeType;
}

function assertTraceabilityRelationship(relationship: string): TraceabilityRelationship {
  if (!(TRACEABILITY_RELATIONSHIPS as readonly string[]).includes(relationship)) {
    throw new Error("Traceability relationship is invalid");
  }

  return relationship as TraceabilityRelationship;
}

export function createTraceabilityNode(input: {
  organizationId: string;
  nodeType: string;
  entityId: string;
  label: string;
}): TraceabilityNode {
  const organizationId = input.organizationId.trim();
  const entityId = input.entityId.trim();
  const label = input.label.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (entityId.length === 0) {
    throw new Error("Traceability entity identifier is required");
  }

  if (label.length === 0) {
    throw new Error("Traceability node label is required");
  }

  const nodeType = assertTraceabilityNodeType(input.nodeType);

  return {
    id: buildTraceabilityNodeId(nodeType, entityId),
    organizationId,
    nodeType,
    entityId,
    label,
  };
}

export function createTraceabilityEdge(input: {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
}): TraceabilityEdge {
  const sourceNodeId = input.sourceNodeId.trim();
  const targetNodeId = input.targetNodeId.trim();

  if (sourceNodeId.length === 0 || targetNodeId.length === 0) {
    throw new Error("Traceability edge endpoints are required");
  }

  if (sourceNodeId === targetNodeId) {
    throw new Error("Traceability edge source and target must differ");
  }

  return {
    sourceNodeId,
    targetNodeId,
    relationship: assertTraceabilityRelationship(input.relationship),
  };
}
