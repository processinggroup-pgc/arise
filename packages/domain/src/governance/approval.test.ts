import { describe, expect, it } from "vitest";

import {
  ApprovalStateError,
  createApproval,
  decideApproval,
  expireApproval,
  isApprovalActive,
} from "./approval.js";

describe("approval lifecycle", () => {
  it("creates a pending approval request", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const approval = createApproval(
      {
        organizationId: "org_123",
        subjectType: "work_item",
        subjectId: "lineage_123",
        approvalType: "plan_approval",
        requestedFrom: "user_owner",
      },
      {
        id: "approval_123",
        createdAt,
      },
    );

    expect(approval.status).toBe("pending");
  });

  it("approves a pending approval request", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");
    const approval = createApproval(
      {
        organizationId: "org_123",
        subjectType: "work_item",
        subjectId: "lineage_123",
        approvalType: "plan_approval",
        requestedFrom: "user_owner",
      },
      {
        id: "approval_123",
        createdAt,
      },
    );

    const approved = decideApproval(approval, {
      decision: "approved",
      decidedBy: "user_approver",
      decidedAt: new Date("2026-08-03T13:00:00.000Z"),
    });

    expect(approved.status).toBe("approved");
    expect(isApprovalActive(approved, new Date("2026-08-03T14:00:00.000Z"))).toBe(true);
  });

  it("rejects decisions on expired approvals", () => {
    const approval = createApproval(
      {
        organizationId: "org_123",
        subjectType: "work_item",
        subjectId: "lineage_123",
        approvalType: "plan_approval",
        requestedFrom: "user_owner",
        expiresAt: new Date("2026-08-03T13:00:00.000Z"),
      },
      {
        id: "approval_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(() =>
      decideApproval(approval, {
        decision: "approved",
        decidedBy: "user_approver",
        decidedAt: new Date("2026-08-03T14:00:00.000Z"),
      }),
    ).toThrow(ApprovalStateError);
  });

  it("expires pending approvals", () => {
    const approval = createApproval(
      {
        organizationId: "org_123",
        subjectType: "work_item",
        subjectId: "lineage_123",
        approvalType: "plan_approval",
        requestedFrom: "user_owner",
      },
      {
        id: "approval_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    const expired = expireApproval(approval, new Date("2026-08-03T14:00:00.000Z"));
    expect(expired.status).toBe("expired");
  });
});
