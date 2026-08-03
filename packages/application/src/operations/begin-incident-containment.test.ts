import { describe, expect, it } from "vitest";

import { createExecutionSession, createTenantContext } from "@arise/domain";

import { InMemoryAuditStore } from "../audit/in-memory-audit-store.js";
import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { declareIncident } from "./declare-incident.js";
import { InMemoryIncidentStore } from "./in-memory-incident-store.js";
import { beginIncidentContainmentForOrganization } from "./begin-incident-containment.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_incident",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("declareIncident", () => {
  it("declares a tenant-scoped incident with audit evidence", async () => {
    const incidentStore = new InMemoryIncidentStore();
    const auditStore = new InMemoryAuditStore();

    const result = await declareIncident(
      {
        tenantContext,
        severity: "high",
        summary: "Suspicious sandbox egress detected",
        workItemId: "work_item_1",
      },
      incidentStore,
      auditStore,
      operationContext,
    );

    expect(result.incident.status).toBe("declared");
    expect(result.incident.organizationId).toBe("org_123");
    expect(result.incident.timeline).toHaveLength(1);

    const auditEvents = await auditStore.listEventsForOrganization("org_123");
    expect(auditEvents.some((event) => event.eventType === "incident_declared")).toBe(true);
  });
});

describe("beginIncidentContainmentForOrganization", () => {
  it("suspends affected executions and revokes temporary credentials", async () => {
    const incidentStore = new InMemoryIncidentStore();
    const auditStore = new InMemoryAuditStore();
    const executionSessionStore = new InMemoryExecutionSessionStore();

    const declared = await declareIncident(
      {
        tenantContext,
        severity: "critical",
        summary: "Credential exposure suspected in sandbox",
        workItemId: "work_item_1",
      },
      incidentStore,
      auditStore,
      operationContext,
    );

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "running",
      },
      { id: "session_1", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    const result = await beginIncidentContainmentForOrganization(
      {
        tenantContext,
        incidentId: declared.incident.id,
        credentialRefsToRevoke: ["SECRET_REF:github-installation-token"],
      },
      incidentStore,
      executionSessionStore,
      auditStore,
      operationContext,
    );

    expect(result.incident.status).toBe("contained");
    expect(result.suspendedExecutionSessionIds).toEqual(["session_1"]);

    const updatedSession = await executionSessionStore.findExecutionSessionById("session_1");
    expect(updatedSession?.state).toBe("quarantined");

    const auditEvents = await auditStore.listEventsForOrganization("org_123");
    expect(auditEvents.some((event) => event.eventType === "incident_containment_began")).toBe(
      true,
    );
  });
});
