import { describe, expect, it } from "vitest";

import { InMemoryIdentityStore } from "./in-memory-identity-store.js";
import { listOrganizationsForUser } from "./list-organizations-for-user.js";
import { registerOrganization } from "./register-organization.js";

describe("listOrganizationsForUser", () => {
  it("returns organizations the user belongs to", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Alpha Studio",
        slug: "alpha-studio",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_123",
      },
      store,
      {
        createId: () => "org_alpha",
        now: () => createdAt,
      },
    );

    await registerOrganization(
      {
        name: "Beta Studio",
        slug: "beta-studio",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_456",
      },
      store,
      {
        createId: () => "org_beta",
        now: () => createdAt,
      },
    );

    const organizations = await listOrganizationsForUser("user_123", store);

    expect(organizations).toHaveLength(1);
    expect(organizations[0]?.slug).toBe("alpha-studio");
  });
});
