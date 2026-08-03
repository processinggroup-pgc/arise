import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { createWorkItemForProject, WorkItemScopeError } from "./create-work-item.js";
import { InMemoryWorkItemStore } from "./in-memory-work-item-store.js";
import { InMemoryRequirementStore } from "./in-memory-requirement-store.js";
import {
  addAcceptanceCriterionToRequirement,
  createRequirementForWorkItem,
  listRequirementsWithCriteriaForWorkItem,
} from "./manage-requirements.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_requirements",
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

async function seedWorkItem(): Promise<{
  lineageId: string;
  workItemStore: InMemoryWorkItemStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();

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

  return { lineageId: workItem.lineageId, workItemStore };
}

describe("createRequirementForWorkItem", () => {
  it("creates a requirement linked to a tenant-owned work item lineage", async () => {
    const { lineageId, workItemStore } = await seedWorkItem();
    const requirementStore = new InMemoryRequirementStore();

    const requirement = await createRequirementForWorkItem(
      {
        tenantContext,
        workItemLineageId: lineageId,
        kind: "functional",
        statement: "Membership lists must remain scoped to the active organization.",
        priority: "must",
        source: "stakeholder",
      },
      workItemStore,
      requirementStore,
      operationContext,
    );

    expect(requirement.workItemLineageId).toBe(lineageId);
    expect(await requirementStore.listRequirementsForWorkItemLineage(lineageId)).toEqual([
      requirement,
    ]);
  });
});

describe("addAcceptanceCriterionToRequirement", () => {
  it("adds GWT acceptance criteria with generated trace references", async () => {
    const { lineageId, workItemStore } = await seedWorkItem();
    const requirementStore = new InMemoryRequirementStore();

    const requirement = await createRequirementForWorkItem(
      {
        tenantContext,
        workItemLineageId: lineageId,
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

    expect(criterion.automatedTestRef).toMatch(/^WI-/u);
    expect(await requirementStore.listAcceptanceCriteriaForRequirement(requirement.id)).toEqual([
      criterion,
    ]);
  });

  it("blocks acceptance criteria creation outside the tenant scope", async () => {
    const { lineageId, workItemStore } = await seedWorkItem();
    const requirementStore = new InMemoryRequirementStore();

    const requirement = await createRequirementForWorkItem(
      {
        tenantContext,
        workItemLineageId: lineageId,
        kind: "functional",
        statement: "Membership lists must remain scoped to the active organization.",
        priority: "must",
        source: "stakeholder",
      },
      workItemStore,
      requirementStore,
      operationContext,
    );

    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      addAcceptanceCriterionToRequirement(
        {
          tenantContext: foreignTenant,
          requirementId: requirement.id,
          given: "context",
          when: "action",
          then: "result",
        },
        requirementStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(WorkItemScopeError);
  });
});

describe("listRequirementsWithCriteriaForWorkItem", () => {
  it("returns requirements with nested acceptance criteria", async () => {
    const { lineageId, workItemStore } = await seedWorkItem();
    const requirementStore = new InMemoryRequirementStore();

    const requirement = await createRequirementForWorkItem(
      {
        tenantContext,
        workItemLineageId: lineageId,
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

    await expect(
      listRequirementsWithCriteriaForWorkItem(
        lineageId,
        tenantContext,
        workItemStore,
        requirementStore,
      ),
    ).resolves.toEqual([
      {
        requirement,
        acceptanceCriteria: [criterion],
      },
    ]);
  });
});
