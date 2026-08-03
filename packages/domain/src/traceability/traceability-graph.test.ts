import { describe, expect, it } from "vitest";

import {
  buildIntentTraceabilityGraph,
  evaluateTraceabilityCoverage,
  type IntentTraceabilityInput,
} from "./traceability-graph.js";

const baseInput: IntentTraceabilityInput = {
  organizationId: "org_123",
  workItemLineageId: "lineage_abc",
  workItemTitle: "Tenant-safe membership listing",
  requirements: [
    {
      id: "req_1",
      statement: "Membership lists must remain scoped to the active organization.",
      acceptanceCriteria: [
        {
          id: "ac_1",
          automatedTestRef: "WI-lineage-REQ-1-AC-1",
        },
      ],
    },
  ],
  explicitLinks: [],
};

describe("buildIntentTraceabilityGraph", () => {
  it("builds a chain from work item through requirement and criterion to test ref", () => {
    const graph = buildIntentTraceabilityGraph(baseInput);

    expect(graph.nodes.map((node) => node.nodeType)).toEqual([
      "work_item",
      "requirement",
      "acceptance_criterion",
      "automated_test",
    ]);

    expect(graph.edges).toEqual([
      {
        sourceNodeId: "work_item:lineage_abc",
        targetNodeId: "requirement:req_1",
        relationship: "scopes",
      },
      {
        sourceNodeId: "requirement:req_1",
        targetNodeId: "acceptance_criterion:ac_1",
        relationship: "specifies",
      },
      {
        sourceNodeId: "acceptance_criterion:ac_1",
        targetNodeId: "automated_test:WI-lineage-REQ-1-AC-1",
        relationship: "traces_to",
      },
    ]);
  });

  it("includes explicit downstream links for code and evidence artifacts", () => {
    const graph = buildIntentTraceabilityGraph({
      ...baseInput,
      explicitLinks: [
        {
          sourceType: "automated_test",
          sourceId: "WI-lineage-REQ-1-AC-1",
          targetType: "code_artifact",
          targetId: "src/memberships/route.ts",
          relationship: "implements",
        },
        {
          sourceType: "automated_test",
          sourceId: "WI-lineage-REQ-1-AC-1",
          targetType: "evidence",
          targetId: "test-run-42",
          relationship: "evidences",
        },
      ],
    });

    expect(graph.nodes.map((node) => node.nodeType)).toContain("code_artifact");
    expect(graph.nodes.map((node) => node.nodeType)).toContain("evidence");
    expect(graph.edges.some((edge) => edge.relationship === "implements")).toBe(true);
    expect(graph.edges.some((edge) => edge.relationship === "evidences")).toBe(true);
  });
});

describe("evaluateTraceabilityCoverage", () => {
  it("reports complete coverage when every requirement has traced criteria", () => {
    const graph = buildIntentTraceabilityGraph(baseInput);
    const coverage = evaluateTraceabilityCoverage(graph);

    expect(coverage.totalRequirements).toBe(1);
    expect(coverage.totalAcceptanceCriteria).toBe(1);
    expect(coverage.criteriaWithTestRef).toBe(1);
    expect(coverage.orphanedRequirements).toEqual([]);
    expect(coverage.uncoveredCriteria).toEqual([]);
    expect(coverage.coverageRatio).toBe(1);
    expect(coverage.complete).toBe(true);
  });

  it("flags orphaned requirements and missing downstream links", () => {
    const graph = buildIntentTraceabilityGraph({
      ...baseInput,
      requirements: [
        {
          id: "req_1",
          statement: "Membership lists must remain scoped to the active organization.",
          acceptanceCriteria: [
            {
              id: "ac_1",
              automatedTestRef: "WI-lineage-REQ-1-AC-1",
            },
          ],
        },
        {
          id: "req_2",
          statement: "Audit events must record cross-tenant access attempts.",
          acceptanceCriteria: [],
        },
      ],
    });

    const coverage = evaluateTraceabilityCoverage(graph);

    expect(coverage.orphanedRequirements).toEqual(["req_2"]);
    expect(coverage.complete).toBe(false);
    expect(coverage.missingDownstreamCriteria).toEqual(["ac_1"]);
  });
});
