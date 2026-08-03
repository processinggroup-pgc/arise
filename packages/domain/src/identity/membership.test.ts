import { describe, expect, it } from "vitest";

import { createOrganizationMembership } from "./membership.js";

describe("createOrganizationMembership", () => {
  it("creates an active owner membership", () => {
    const createdAt = new Date("2026-08-03T00:00:00.000Z");
    const membership = createOrganizationMembership(
      {
        organizationId: "org_123",
        userId: "user_123",
        role: "owner",
        status: "active",
      },
      {
        id: "mem_123",
        createdAt,
      },
    );

    expect(membership).toEqual({
      id: "mem_123",
      organizationId: "org_123",
      userId: "user_123",
      role: "owner",
      status: "active",
      createdAt,
    });
  });

  it("rejects unsupported membership roles", () => {
    expect(() =>
      createOrganizationMembership(
        {
          organizationId: "org_123",
          userId: "user_123",
          role: "superadmin",
          status: "active",
        },
        { id: "mem_123", createdAt: new Date() },
      ),
    ).toThrow("Membership role is invalid");
  });

  it("rejects unsupported membership statuses", () => {
    expect(() =>
      createOrganizationMembership(
        {
          organizationId: "org_123",
          userId: "user_123",
          role: "member",
          status: "deleted",
        },
        { id: "mem_123", createdAt: new Date() },
      ),
    ).toThrow("Membership status is invalid");
  });
});
