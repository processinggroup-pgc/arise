import { describe, expect, it } from "vitest";

import { AUDIT_ACTOR_TYPES, AUDIT_EVENT_TYPES } from "./audit-event-types.js";
import { createAuditEvent } from "./audit-event.js";

describe("createAuditEvent", () => {
  it("creates an audit event with a redacted payload", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const event = createAuditEvent(
      {
        organizationId: "org_123",
        actorType: "user",
        actorId: "user_owner",
        eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
        subject: "org_other",
        correlationId: "corr_123",
        payload: {
          requestedOrganizationId: "org_other",
          token: "Bearer sk-abcdefghijklmnopqrstuvwxyz123456",
        },
      },
      {
        id: "audit_1",
        createdAt,
      },
    );

    expect(event).toMatchObject({
      id: "audit_1",
      organizationId: "org_123",
      actorType: "user",
      actorId: "user_owner",
      eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
      subject: "org_other",
      correlationId: "corr_123",
      createdAt,
    });
    expect(event.payloadRedacted).toContain("[REDACTED]");
    expect(event.payloadRedacted).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456");
  });

  it("requires organization, actor, event type, subject, and correlation identifiers", () => {
    expect(() =>
      createAuditEvent(
        {
          organizationId: "",
          actorType: "user",
          actorId: "user_owner",
          eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
          subject: "org_other",
          correlationId: "corr_123",
        },
        {
          id: "audit_1",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Organization identifier is required");
  });

  it("rejects invalid actor types", () => {
    expect(() =>
      createAuditEvent(
        {
          organizationId: "org_123",
          actorType: "bot",
          actorId: "user_owner",
          eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
          subject: "org_other",
          correlationId: "corr_123",
        },
        {
          id: "audit_1",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Audit actor type is invalid");
  });

  it("accepts all supported actor types", () => {
    for (const actorType of AUDIT_ACTOR_TYPES) {
      const event = createAuditEvent(
        {
          organizationId: "org_123",
          actorType,
          actorId: "actor_1",
          eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
          subject: "subject",
          correlationId: "corr_123",
        },
        {
          id: `audit_${actorType}`,
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      );

      expect(event.actorType).toBe(actorType);
    }
  });
});
