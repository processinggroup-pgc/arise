import { describe, expect, it } from "vitest";

import { createTenantContext, READINESS_FIELDS } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { createWorkItemForProject } from "./create-work-item.js";
import { InMemoryWorkItemStore } from "./in-memory-work-item-store.js";
import { InMemoryRequirementStore } from "./in-memory-requirement-store.js";
import { assessWorkItemReadiness } from "./assess-work-item-readiness.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_readiness",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const incompleteWorkItemInput = {
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

const readyWorkItemFields = {
  currentBehavior: "Membership lists can be requested without tenant validation.",
  measurableOutcome: "Cross-tenant membership reads return zero rows in security tests.",
  affectedSystems: ["memberships API"],
  dependencies: ["tenant context middleware"],
  decisionAuthority: "Processing group owner",
};

describe("assessWorkItemReadiness", () => {
  it("moves incomplete work items to not_ready with missing field details", async () => {
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
        ...incompleteWorkItemInput,
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    const result = await assessWorkItemReadiness(
      {
        tenantContext,
        lineageId: workItem.lineageId,
      },
      projectStore,
      workItemStore,
      requirementStore,
      operationContext,
    );

    expect(result.workItem.state).toBe("not_ready");
    expect(result.evaluation.ready).toBe(false);
    expect(result.evaluation.missingFields.map((field) => field.field)).toContain(
      READINESS_FIELDS.currentBehavior,
    );
  });

  it("moves ready work items to ready_for_recommendation", async () => {
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
        ...incompleteWorkItemInput,
        ...readyWorkItemFields,
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    const result = await assessWorkItemReadiness(
      {
        tenantContext,
        lineageId: workItem.lineageId,
      },
      projectStore,
      workItemStore,
      requirementStore,
      operationContext,
    );

    expect(result.workItem.state).toBe("ready_for_recommendation");
    expect(result.evaluation.ready).toBe(true);
    expect(result.evaluation.missingFields).toEqual([]);
  });
});
