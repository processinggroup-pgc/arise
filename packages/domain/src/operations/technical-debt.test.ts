import { describe, expect, it } from "vitest";

import {
  assignTechnicalDebtSupportOwner,
  createTechnicalDebtItem,
  evaluateTechnicalDebtOverdue,
  resolveTechnicalDebtItem,
} from "./technical-debt.js";

const now = new Date("2026-08-03T12:00:00.000Z");
const dueDate = new Date("2026-08-10T12:00:00.000Z");

describe("technical debt tracking", () => {
  it("creates tenant-scoped debt linked to a project and source work item", () => {
    const item = createTechnicalDebtItem(
      {
        organizationId: "org_123",
        projectId: "project_1",
        sourceWorkItemId: "work_item_1",
        description: "Flaky integration test quarantined pending stabilization",
        risk: "medium",
        ownerId: "user_owner",
        dueDate,
      },
      { id: "debt_1", createdAt: now },
    );

    expect(item.status).toBe("open");
    expect(item.ownerId).toBe("user_owner");
    expect(item.supportOwnerId).toBeUndefined();
  });

  it("assigns support ownership for ongoing maintenance", () => {
    const item = createTechnicalDebtItem(
      {
        organizationId: "org_123",
        projectId: "project_1",
        sourceWorkItemId: "work_item_1",
        description: "Temporary RLS bypass in preview branch tooling",
        risk: "high",
        ownerId: "user_owner",
        dueDate,
      },
      { id: "debt_1", createdAt: now },
    );

    const assigned = assignTechnicalDebtSupportOwner(item, {
      supportOwnerId: "user_support",
      updatedAt: now,
    });

    expect(assigned.supportOwnerId).toBe("user_support");
  });

  it("flags overdue debt items", () => {
    const item = createTechnicalDebtItem(
      {
        organizationId: "org_123",
        projectId: "project_1",
        sourceWorkItemId: "work_item_1",
        description: "Missing rollback script for migration",
        risk: "high",
        ownerId: "user_owner",
        dueDate: new Date("2026-08-01T12:00:00.000Z"),
      },
      { id: "debt_1", createdAt: now },
    );

    const evaluation = evaluateTechnicalDebtOverdue(item, new Date("2026-08-03T12:00:00.000Z"));

    expect(evaluation.overdue).toBe(true);
  });

  it("resolves debt when remediation is complete", () => {
    const item = createTechnicalDebtItem(
      {
        organizationId: "org_123",
        projectId: "project_1",
        sourceWorkItemId: "work_item_1",
        description: "Hard-coded preview URL fallback",
        risk: "low",
        ownerId: "user_owner",
        dueDate,
      },
      { id: "debt_1", createdAt: now },
    );

    const resolved = resolveTechnicalDebtItem(item, now);

    expect(resolved.status).toBe("resolved");
  });
});
