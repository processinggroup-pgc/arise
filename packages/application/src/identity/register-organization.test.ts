import { describe, expect, it } from "vitest";

import { InMemoryIdentityStore } from "./in-memory-identity-store.js";
import { registerOrganization } from "./register-organization.js";

describe("registerOrganization", () => {
  it("creates an organization and founding owner membership", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    const result = await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_123",
      },
      store,
      {
        createId: () => "org_123",
        now: () => createdAt,
      },
    );

    expect(result.organization.slug).toBe("processing-group");
    expect(result.membership).toMatchObject({
      organizationId: "org_123",
      userId: "user_123",
      role: "owner",
      status: "active",
    });

    const memberships = await store.listMembershipsForOrganization("org_123");
    expect(memberships).toHaveLength(1);
  });

  it("rejects duplicate organization slugs", async () => {
    const store = new InMemoryIdentityStore();

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_123",
      },
      store,
      {
        createId: () => "org_123",
        now: () => new Date("2026-08-03T00:00:00.000Z"),
      },
    );

    await expect(
      registerOrganization(
        {
          name: "Another Group",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
          ownerUserId: "user_456",
        },
        store,
        {
          createId: () => "org_456",
          now: () => new Date("2026-08-03T00:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("Organization slug is already in use");
  });
});
