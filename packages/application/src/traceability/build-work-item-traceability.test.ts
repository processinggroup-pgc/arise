import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { createWorkItemForProject, WorkItemScopeError } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { InMemoryRequirementStore } from "../intent/in-memory-requirement-store.js";
import {
  addAcceptanceCriterionToRequirement,
  createRequirementForWorkItem,
} from "../intent/manage-requirements.js";
import { InMemoryTraceabilityLinkStore } from "./in-memory-traceability-link-store.js";
import {
  buildWorkItemTraceabilityGraph,
  recordTraceabilityLink,
} from "./build-work-item-traceability.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_traceability",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const workItemInput = {
  title: "Tenant-safe membership listing",
  type: "feature",
  riskLevel: "medium",
  ownerId: "user_owner",
  problemStatement: "Operators cannot inspect memberships safely across tenants.",
  targetUser: "Platform operator",
  desiredBehavior: "Membership lists are scoped to the active organization only.",
  dataClassification: "internal",
  acceptanceCriteria: [
    {
      given: "a tenant context for organization A",
      when: "memberships are listed",
      then: "only organization A memberships are returned",
    },
  ],
};

async function seedWorkItemWithRequirement(): Promise<{
  lineageId: string;
  automatedTestRef: string;
  workItemStore: InMemoryWorkItemStore;
  requirementStore: InMemoryRequirementStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const requirementStore = new InMemoryRequirementStore();

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      ...workItemInput,
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  const requirement = await createRequirementForWorkItem(
    {
      tenantContext,
      workItemLineageId: workItem.lineageId,
      kind: "functional",
      statement: "Membership lists must remain scoped to the active organization.",
      priority: "must",
      source: "stakeholder",
    },
    workItemStore,
    requirementStore,
    operationContext,
  );

  const criterion = await addAcceptanceCriterionToRequirement(
    {
      tenantContext,
      requirementId: requirement.id,
      given: "a tenant context for organization A",
      when: "memberships are listed",
      then: "only organization A memberships are returned",
    },
    requirementStore,
    operationContext,
  );

  return {
    lineageId: workItem.lineageId,
    automatedTestRef: criterion.automatedTestRef,
    workItemStore,
    requirementStore,
  };
}

describe("buildWorkItemTraceabilityGraph", () => {
  it("builds a requirement-to-test graph for a tenant-owned work item", async () => {
    const seeded = await seedWorkItemWithRequirement();
    const traceabilityLinkStore = new InMemoryTraceabilityLinkStore();

    const result = await buildWorkItemTraceabilityGraph(
      {
        tenantContext,
        workItemLineageId: seeded.lineageId,
      },
      seeded.workItemStore,
      seeded.requirementStore,
      traceabilityLinkStore,
    );

    expect(result.graph.workItemLineageId).toBe(seeded.lineageId);
    expect(result.graph.nodes.map((node) => node.nodeType)).toEqual([
      "work_item",
      "requirement",
      "acceptance_criterion",
      "automated_test",
    ]);
    expect(result.coverage.complete).toBe(true);
    expect(result.coverage.coverageRatio).toBe(1);
  });

  it("includes explicit downstream links in coverage calculations", async () => {
    const seeded = await seedWorkItemWithRequirement();
    const traceabilityLinkStore = new InMemoryTraceabilityLinkStore();

    await recordTraceabilityLink(
      {
        tenantContext,
        workItemLineageId: seeded.lineageId,
        sourceType: "automated_test",
        sourceId: seeded.automatedTestRef,
        targetType: "code_artifact",
        targetId: "src/memberships/route.ts",
        relationship: "implements",
      },
      seeded.workItemStore,
      traceabilityLinkStore,
      operationContext,
    );

    const result = await buildWorkItemTraceabilityGraph(
      {
        tenantContext,
        workItemLineageId: seeded.lineageId,
      },
      seeded.workItemStore,
      seeded.requirementStore,
      traceabilityLinkStore,
    );

    expect(result.coverage.missingDownstreamCriteria).toEqual([]);
    expect(result.coverage.criteriaWithDownstreamLinks).toBe(1);
    expect(result.graph.edges.some((edge) => edge.relationship === "implements")).toBe(true);
  });

  it("blocks traceability queries outside the tenant scope", async () => {
    const seeded = await seedWorkItemWithRequirement();
    const traceabilityLinkStore = new InMemoryTraceabilityLinkStore();
    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      buildWorkItemTraceabilityGraph(
        {
          tenantContext: foreignTenant,
          workItemLineageId: seeded.lineageId,
        },
        seeded.workItemStore,
        seeded.requirementStore,
        traceabilityLinkStore,
      ),
    ).rejects.toBeInstanceOf(WorkItemScopeError);
  });
});

describe("recordTraceabilityLink", () => {
  it("persists explicit links scoped to the work item lineage", async () => {
    const seeded = await seedWorkItemWithRequirement();
    const traceabilityLinkStore = new InMemoryTraceabilityLinkStore();

    const link = await recordTraceabilityLink(
      {
        tenantContext,
        workItemLineageId: seeded.lineageId,
        sourceType: "automated_test",
        sourceId: seeded.automatedTestRef,
        targetType: "evidence",
        targetId: "test-run-42",
        relationship: "evidences",
      },
      seeded.workItemStore,
      traceabilityLinkStore,
      operationContext,
    );

    expect(link.relationship).toBe("evidences");
    expect(
      await traceabilityLinkStore.listTraceabilityLinksForWorkItemLineage(
        tenantContext.organizationId,
        seeded.lineageId,
      ),
    ).toEqual([link]);
  });
});
