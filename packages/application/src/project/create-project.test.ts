import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { createProjectForOrganization } from "./create-project.js";
import { InMemoryProjectStore } from "./in-memory-project-store.js";

describe("createProjectForOrganization", () => {
  it("creates a project scoped to the tenant organization", async () => {
    const store = new InMemoryProjectStore();
    const tenantContext = createTenantContext({
      organizationId: "org_123",
      userId: "user_owner",
      correlationId: "corr_project",
    });

    const project = await createProjectForOrganization(
      {
        tenantContext,
        name: "Customer Portal",
        description: "Delivery workspace",
      },
      store,
      {
        createId: () => "project_123",
        now: () => new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(project.organizationId).toBe("org_123");
    expect(await store.listProjectsForOrganization("org_123")).toEqual([project]);
  });
});
