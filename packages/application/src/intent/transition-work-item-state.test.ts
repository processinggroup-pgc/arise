import { describe, expect, it } from "vitest";

import { createTenantContext, WorkItemTransitionError } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { createWorkItemForProject } from "./create-work-item.js";
import { InMemoryWorkItemStore } from "./in-memory-work-item-store.js";
import { applyWorkItemTransition } from "./transition-work-item-state.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_transition",
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

describe("applyWorkItemTransition", () => {
  it("creates a new version when a lifecycle transition succeeds", async () => {
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

    const assessing = await applyWorkItemTransition(
      {
        tenantContext,
        lineageId: workItem.lineageId,
        transition: "start_assessment",
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    expect(assessing.state).toBe("assessing");
    expect(assessing.version).toBe(2);
    expect(await workItemStore.listVersionsByLineageId(workItem.lineageId)).toHaveLength(2);
  });

  it("is idempotent without creating duplicate versions", async () => {
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

    const assessing = await applyWorkItemTransition(
      {
        tenantContext,
        lineageId: workItem.lineageId,
        transition: "start_assessment",
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    const duplicate = await applyWorkItemTransition(
      {
        tenantContext,
        lineageId: workItem.lineageId,
        transition: "start_assessment",
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    expect(duplicate).toBe(assessing);
    expect(await workItemStore.listVersionsByLineageId(workItem.lineageId)).toHaveLength(2);
  });

  it("blocks invalid lifecycle transitions", async () => {
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

    await expect(
      applyWorkItemTransition(
        {
          tenantContext,
          lineageId: workItem.lineageId,
          transition: "approve_plan",
        },
        projectStore,
        workItemStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(WorkItemTransitionError);
  });
});
