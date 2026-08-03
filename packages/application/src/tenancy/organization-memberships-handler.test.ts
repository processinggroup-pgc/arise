import { describe, expect, it } from "vitest";

import { InMemoryIdentityStore } from "../identity/in-memory-identity-store.js";
import { registerOrganization } from "../identity/register-organization.js";
import { createOrganizationMembershipsHandler } from "./organization-memberships-handler.js";
import { TENANT_HEADERS } from "./resolve-api-tenant-context.js";

describe("organization memberships API handler", () => {
  it("returns memberships for the active tenant context", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group-api-test",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_owner",
      },
      store,
      {
        createId: () => "org_123",
        now: () => createdAt,
      },
    );

    const handler = createOrganizationMembershipsHandler(store);
    const request = new Request("http://localhost/api/v1/organizations/org_123/memberships", {
      headers: {
        [TENANT_HEADERS.organizationId]: "org_123",
        [TENANT_HEADERS.userId]: "user_owner",
        [TENANT_HEADERS.correlationId]: "corr_123",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({ organizationId: "org_123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      organizationId: "org_123",
      memberships: [{ userId: "user_owner", role: "owner" }],
    });
  });
});
