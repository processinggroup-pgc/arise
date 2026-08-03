import { describe, expect, it } from "vitest";

import { AUDIT_EVENT_TYPES, createTenantContext } from "@arise/domain";

import { InMemoryAuditStore } from "./in-memory-audit-store.js";
import { recordAuditEvent, recordTenantScopeViolation } from "./record-audit-event.js";

describe("recordAuditEvent", () => {
  it("appends a tenant-scoped audit event to the store", async () => {
    const store = new InMemoryAuditStore();
    const tenantContext = createTenantContext({
      organizationId: "org_123",
      userId: "user_owner",
      correlationId: "corr_123",
    });

    const event = await recordAuditEvent(
      {
        tenantContext,
        eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
        subject: "org_other",
        payload: { requestedOrganizationId: "org_other" },
      },
      store,
      {
        createId: () => "audit_1",
        now: () => new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(event.id).toBe("audit_1");
    expect(await store.listEventsForOrganization("org_123")).toEqual([event]);
  });
});

describe("recordTenantScopeViolation", () => {
  it("records a tenant scope violation with the requesting organization context", async () => {
    const store = new InMemoryAuditStore();
    const tenantContext = createTenantContext({
      organizationId: "org_a",
      userId: "user_a",
      correlationId: "corr_scope",
    });

    const event = await recordTenantScopeViolation(tenantContext, "org_b", store, {
      createId: () => "audit_scope",
      now: () => new Date("2026-08-03T12:00:00.000Z"),
    });

    expect(event.eventType).toBe(AUDIT_EVENT_TYPES.tenantScopeViolation);
    expect(event.subject).toBe("org_b");
    expect(event.organizationId).toBe("org_a");
  });
});
