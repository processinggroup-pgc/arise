import { describe, expect, it } from "vitest";

import { addOrganizationMember } from "./add-organization-member.js";
import { InMemoryIdentityStore } from "./in-memory-identity-store.js";
import { registerOrganization } from "./register-organization.js";

describe("addOrganizationMember", () => {
  it("adds a member to an existing organization", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
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

    const membership = await addOrganizationMember(
      {
        organizationId: "org_123",
        userId: "user_member",
        role: "member",
        status: "active",
      },
      store,
      {
        createId: () => "mem_456",
        now: () => createdAt,
      },
    );

    expect(membership).toMatchObject({
      organizationId: "org_123",
      userId: "user_member",
      role: "member",
      status: "active",
    });

    const memberships = await store.listMembershipsForOrganization("org_123");
    expect(memberships).toHaveLength(2);
  });

  it("rejects duplicate memberships for the same user", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
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

    await expect(
      addOrganizationMember(
        {
          organizationId: "org_123",
          userId: "user_owner",
          role: "admin",
          status: "active",
        },
        store,
        {
          createId: () => "mem_dup",
          now: () => createdAt,
        },
      ),
    ).rejects.toThrow("Membership already exists for this user");
  });
});
