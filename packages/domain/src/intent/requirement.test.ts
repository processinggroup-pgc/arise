import { describe, expect, it } from "vitest";

import { createRequirement } from "./requirement.js";

describe("createRequirement", () => {
  it("creates a draft requirement for a work item lineage", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const requirement = createRequirement(
      {
        workItemLineageId: "lineage_123",
        organizationId: "org_123",
        kind: "functional",
        statement: "Membership lists must remain scoped to the active organization.",
        priority: "must",
        source: "stakeholder",
      },
      {
        id: "requirement_123",
        createdAt,
      },
    );

    expect(requirement).toEqual({
      id: "requirement_123",
      workItemLineageId: "lineage_123",
      organizationId: "org_123",
      kind: "functional",
      statement: "Membership lists must remain scoped to the active organization.",
      priority: "must",
      source: "stakeholder",
      status: "draft",
      createdAt,
    });
  });

  it("requires a substantive requirement statement", () => {
    expect(() =>
      createRequirement(
        {
          workItemLineageId: "lineage_123",
          organizationId: "org_123",
          kind: "functional",
          statement: "short",
          priority: "must",
          source: "stakeholder",
        },
        {
          id: "requirement_123",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Requirement statement is required");
  });
});
