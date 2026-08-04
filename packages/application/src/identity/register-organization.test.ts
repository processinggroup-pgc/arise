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

  it("returns the existing organization when the same owner recreates the slug", async () => {
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

    const result = await registerOrganization(
      {
        name: "Processing Group Retry",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_123",
      },
      store,
      {
        createId: () => "org_retry",
        now: () => new Date("2026-08-03T01:00:00.000Z"),
      },
    );

    expect(result.organization.id).toBe("org_123");
    expect(result.membership.userId).toBe("user_123");
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

  it("repairs an orphaned organization slug by creating owner membership", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await store.saveOrganization({
      id: "org_orphan",
      name: "Processing Group",
      slug: "processing-group",
      plan: "starter",
      dataRegion: "us-east-1",
      createdAt,
    });

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
        createId: () => "membership_repair",
        now: () => createdAt,
      },
    );

    expect(result.organization.id).toBe("org_orphan");
    expect(result.membership).toMatchObject({
      id: "membership_repair",
      organizationId: "org_orphan",
      userId: "user_123",
      role: "owner",
      status: "active",
    });
  });
});
