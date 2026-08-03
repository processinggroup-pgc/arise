import { describe, expect, it } from "vitest";

import { createOrganization, normalizeOrganizationSlug } from "./organization.js";

describe("normalizeOrganizationSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(normalizeOrganizationSlug("Processing Group")).toBe("processing-group");
  });

  it("rejects slugs with invalid characters", () => {
    expect(() => normalizeOrganizationSlug("bad slug!")).toThrow("Organization slug is invalid");
  });
});

describe("createOrganization", () => {
  it("creates an organization with required fields", () => {
    const createdAt = new Date("2026-08-03T00:00:00.000Z");
    const organization = createOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
      },
      {
        id: "org_123",
        createdAt,
      },
    );

    expect(organization).toEqual({
      id: "org_123",
      name: "Processing Group",
      slug: "processing-group",
      plan: "starter",
      dataRegion: "us-east-1",
      createdAt,
    });
  });

  it("rejects an empty organization name", () => {
    expect(() =>
      createOrganization(
        {
          name: "   ",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        },
        { id: "org_123", createdAt: new Date() },
      ),
    ).toThrow("Organization name is required");
  });

  it("rejects unsupported organization plans", () => {
    expect(() =>
      createOrganization(
        {
          name: "Processing Group",
          slug: "processing-group",
          plan: "enterprise-plus",
          dataRegion: "us-east-1",
        },
        { id: "org_123", createdAt: new Date() },
      ),
    ).toThrow("Organization plan is invalid");
  });
});
