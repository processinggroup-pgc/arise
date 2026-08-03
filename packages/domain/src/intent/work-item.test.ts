import { describe, expect, it } from "vitest";

import { createWorkItem, createWorkItemRevision } from "./work-item.js";

const baseInput = {
  projectId: "project_123",
  organizationId: "org_123",
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

describe("createWorkItem", () => {
  it("creates version 1 with a stable lineage identifier", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const workItem = createWorkItem(baseInput, {
      id: "work_item_v1",
      lineageId: "lineage_123",
      createdAt,
    });

    expect(workItem.version).toBe(1);
    expect(workItem.lineageId).toBe("lineage_123");
    expect(workItem.state).toBe("draft");
    expect(workItem.constraints).toEqual([]);
    expect(workItem.nonGoals).toEqual([]);
  });

  it("requires at least one complete acceptance criterion", () => {
    expect(() =>
      createWorkItem(
        {
          ...baseInput,
          acceptanceCriteria: [{ given: " ", when: "action", then: "result" }],
        },
        {
          id: "work_item_v1",
          lineageId: "lineage_123",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Acceptance criterion fields are required");
  });
});

describe("createWorkItemRevision", () => {
  it("creates the next version while preserving lineage and project scope", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");
    const original = createWorkItem(baseInput, {
      id: "work_item_v1",
      lineageId: "lineage_123",
      createdAt,
    });

    const revised = createWorkItemRevision(
      original,
      {
        title: "Tenant-safe membership listing v2",
        desiredBehavior: "Membership lists are scoped and audited.",
      },
      {
        id: "work_item_v2",
        createdAt: new Date("2026-08-03T13:00:00.000Z"),
      },
    );

    expect(revised.version).toBe(2);
    expect(revised.lineageId).toBe("lineage_123");
    expect(revised.projectId).toBe("project_123");
    expect(revised.organizationId).toBe("org_123");
    expect(revised.title).toBe("Tenant-safe membership listing v2");
    expect(revised.desiredBehavior).toBe("Membership lists are scoped and audited.");
    expect(revised.problemStatement).toBe(original.problemStatement);
  });
});
