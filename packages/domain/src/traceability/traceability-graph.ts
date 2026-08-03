import {
  createTraceabilityEdge,
  createTraceabilityNode,
  type ExplicitTraceabilityRelationship,
  type TraceabilityGraph,
  type TraceabilitySubjectType,
} from "./traceability-types.js";

export interface IntentTraceabilityCriterionInput {
  id: string;
  automatedTestRef: string;
}

export interface IntentTraceabilityRequirementInput {
  id: string;
  statement: string;
  acceptanceCriteria: IntentTraceabilityCriterionInput[];
}

export interface IntentTraceabilityLinkInput {
  sourceType: TraceabilitySubjectType;
  sourceId: string;
  targetType: TraceabilitySubjectType;
  targetId: string;
  relationship: ExplicitTraceabilityRelationship;
}

export interface IntentTraceabilityInput {
  organizationId: string;
  workItemLineageId: string;
  workItemTitle: string;
  requirements: IntentTraceabilityRequirementInput[];
  explicitLinks: IntentTraceabilityLinkInput[];
}

export interface TraceabilityCoverageResult {
  totalRequirements: number;
  totalAcceptanceCriteria: number;
  criteriaWithTestRef: number;
  criteriaWithDownstreamLinks: number;
  orphanedRequirements: string[];
  uncoveredCriteria: string[];
  missingDownstreamCriteria: string[];
  coverageRatio: number;
  complete: boolean;
}

function upsertNode(
  nodes: Map<string, ReturnType<typeof createTraceabilityNode>>,
  node: ReturnType<typeof createTraceabilityNode>,
): void {
  nodes.set(node.id, node);
}

function upsertEdge(
  edges: Map<string, ReturnType<typeof createTraceabilityEdge>>,
  edge: ReturnType<typeof createTraceabilityEdge>,
): void {
  edges.set(`${edge.sourceNodeId}->${edge.targetNodeId}:${edge.relationship}`, edge);
}

function summarizeRequirementLabel(statement: string): string {
  return statement.length <= 80 ? statement : `${statement.slice(0, 77)}...`;
}

export function buildIntentTraceabilityGraph(input: IntentTraceabilityInput): TraceabilityGraph {
  const organizationId = input.organizationId.trim();
  const workItemLineageId = input.workItemLineageId.trim();
  const nodes = new Map<string, ReturnType<typeof createTraceabilityNode>>();
  const edges = new Map<string, ReturnType<typeof createTraceabilityEdge>>();

  const workItemNode = createTraceabilityNode({
    organizationId,
    nodeType: "work_item",
    entityId: workItemLineageId,
    label: input.workItemTitle.trim(),
  });
  upsertNode(nodes, workItemNode);

  for (const requirement of input.requirements) {
    const requirementNode = createTraceabilityNode({
      organizationId,
      nodeType: "requirement",
      entityId: requirement.id,
      label: summarizeRequirementLabel(requirement.statement),
    });
    upsertNode(nodes, requirementNode);
    upsertEdge(
      edges,
      createTraceabilityEdge({
        sourceNodeId: workItemNode.id,
        targetNodeId: requirementNode.id,
        relationship: "scopes",
      }),
    );

    for (const criterion of requirement.acceptanceCriteria) {
      const criterionNode = createTraceabilityNode({
        organizationId,
        nodeType: "acceptance_criterion",
        entityId: criterion.id,
        label: criterion.automatedTestRef,
      });
      upsertNode(nodes, criterionNode);
      upsertEdge(
        edges,
        createTraceabilityEdge({
          sourceNodeId: requirementNode.id,
          targetNodeId: criterionNode.id,
          relationship: "specifies",
        }),
      );

      const testRef = criterion.automatedTestRef.trim();
      if (testRef.length > 0) {
        const testNode = createTraceabilityNode({
          organizationId,
          nodeType: "automated_test",
          entityId: testRef,
          label: testRef,
        });
        upsertNode(nodes, testNode);
        upsertEdge(
          edges,
          createTraceabilityEdge({
            sourceNodeId: criterionNode.id,
            targetNodeId: testNode.id,
            relationship: "traces_to",
          }),
        );
      }
    }
  }

  for (const link of input.explicitLinks) {
    const sourceNode = createTraceabilityNode({
      organizationId,
      nodeType: link.sourceType,
      entityId: link.sourceId,
      label: link.sourceId,
    });
    const targetNode = createTraceabilityNode({
      organizationId,
      nodeType: link.targetType,
      entityId: link.targetId,
      label: link.targetId,
    });
    upsertNode(nodes, sourceNode);
    upsertNode(nodes, targetNode);
    upsertEdge(
      edges,
      createTraceabilityEdge({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        relationship: link.relationship,
      }),
    );
  }

  return {
    organizationId,
    workItemLineageId,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

export function evaluateTraceabilityCoverage(graph: TraceabilityGraph): TraceabilityCoverageResult {
  const requirementNodes = graph.nodes.filter((node) => node.nodeType === "requirement");
  const criterionNodes = graph.nodes.filter((node) => node.nodeType === "acceptance_criterion");
  const totalRequirements = requirementNodes.length;
  const totalAcceptanceCriteria = criterionNodes.length;

  const orphanedRequirements = requirementNodes
    .filter(
      (requirementNode) =>
        !graph.edges.some(
          (edge) => edge.sourceNodeId === requirementNode.id && edge.relationship === "specifies",
        ),
    )
    .map((node) => node.entityId);

  const uncoveredCriteria = criterionNodes
    .filter(
      (criterionNode) =>
        !graph.edges.some(
          (edge) => edge.sourceNodeId === criterionNode.id && edge.relationship === "traces_to",
        ),
    )
    .map((node) => node.entityId);

  const criteriaWithTestRef = totalAcceptanceCriteria - uncoveredCriteria.length;

  const missingDownstreamCriteria = criterionNodes
    .filter((criterionNode) => {
      const testEdge = graph.edges.find(
        (edge) => edge.sourceNodeId === criterionNode.id && edge.relationship === "traces_to",
      );
      if (testEdge === undefined) {
        return false;
      }

      return !graph.edges.some(
        (edge) =>
          edge.sourceNodeId === testEdge.targetNodeId &&
          (edge.relationship === "implements" || edge.relationship === "evidences"),
      );
    })
    .map((node) => node.entityId);

  const criteriaWithDownstreamLinks = totalAcceptanceCriteria - missingDownstreamCriteria.length;

  const coverageRatio =
    totalAcceptanceCriteria === 0 ? 0 : criteriaWithTestRef / totalAcceptanceCriteria;

  const complete =
    orphanedRequirements.length === 0 &&
    uncoveredCriteria.length === 0 &&
    totalRequirements > 0 &&
    totalAcceptanceCriteria > 0;

  return {
    totalRequirements,
    totalAcceptanceCriteria,
    criteriaWithTestRef,
    criteriaWithDownstreamLinks,
    orphanedRequirements,
    uncoveredCriteria,
    missingDownstreamCriteria,
    coverageRatio,
    complete,
  };
}
