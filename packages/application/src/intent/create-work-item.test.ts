import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryWorkItemStore } from "./in-memory-work-item-store.js";
import {
  createWorkItemForProject,
  reviseWorkItemVersion,
  WorkItemScopeError,
} from "./create-work-item.js";

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_work_item",
});

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

describe("createWorkItemForProject", () => {
  it("creates version 1 for a tenant-owned project", async () => {
    const projectStore = new InMemoryProjectStore();
    const workItemStore = new InMemoryWorkItemStore();

    const project = await createProjectForOrganization(
      {
        tenantContext,
        name: "Customer Portal",
      },
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

    expect(workItem.version).toBe(1);
    expect(workItem.projectId).toBe(project.id);
    expect(workItem.organizationId).toBe("org_123");
    expect(await workItemStore.listWorkItemsForProject(project.id)).toEqual([workItem]);
  });

  it("blocks work item creation for projects outside the tenant scope", async () => {
    const projectStore = new InMemoryProjectStore();
    const workItemStore = new InMemoryWorkItemStore();

    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    const project = await createProjectForOrganization(
      {
        tenantContext: foreignTenant,
        name: "Foreign Project",
      },
      projectStore,
      operationContext,
    );

    await expect(
      createWorkItemForProject(
        {
          tenantContext,
          projectId: project.id,
          ...workItemInput,
        },
        projectStore,
        workItemStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(WorkItemScopeError);
  });
});

describe("reviseWorkItemVersion", () => {
  it("creates the next version while preserving lineage history", async () => {
    const projectStore = new InMemoryProjectStore();
    const workItemStore = new InMemoryWorkItemStore();

    const project = await createProjectForOrganization(
      {
        tenantContext,
        name: "Customer Portal",
      },
      projectStore,
      operationContext,
    );

    const original = await createWorkItemForProject(
      {
        tenantContext,
        projectId: project.id,
        ...workItemInput,
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    const revised = await reviseWorkItemVersion(
      {
        tenantContext,
        lineageId: original.lineageId,
        title: "Tenant-safe membership listing v2",
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    expect(revised.version).toBe(2);
    expect(revised.lineageId).toBe(original.lineageId);
    expect(await workItemStore.listVersionsByLineageId(original.lineageId)).toEqual([
      original,
      revised,
    ]);
    expect(await workItemStore.listWorkItemsForProject(project.id)).toEqual([revised]);
  });
});
