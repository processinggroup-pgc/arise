import { describe, expect, it } from "vitest";

import { createExecutionSession } from "../execution/execution-session.js";
import {
  appendIncidentTimelineEvent,
  beginIncidentContainment,
  createIncident,
  DEFAULT_INCIDENT_CONTAINMENT_ACTIONS,
  evaluateContainmentReadiness,
} from "./incident.js";
import { quarantineExecutionSessionForIncident } from "./incident-containment.js";

const now = new Date("2026-08-03T12:00:00.000Z");

describe("incident declaration", () => {
  it("creates a declared incident with an auditable timeline", () => {
    const incident = createIncident(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        severity: "high",
        summary: "Suspicious outbound network activity detected in sandbox",
        declaredBy: "user_owner",
      },
      { id: "incident_1", declaredAt: now },
    );

    expect(incident.status).toBe("declared");
    expect(incident.timeline).toHaveLength(1);
    expect(incident.containment).toHaveLength(DEFAULT_INCIDENT_CONTAINMENT_ACTIONS.length);
  });

  it("appends timeline events without exposing secret values in summaries", () => {
    const incident = createIncident(
      {
        organizationId: "org_123",
        severity: "critical",
        summary: "Credential exposure suspected",
        declaredBy: "user_owner",
      },
      { id: "incident_1", declaredAt: now },
    );

    const updated = appendIncidentTimelineEvent(incident, {
      id: "timeline_2",
      type: "containment_started",
      summary: "Containment started; SECRET_REF:github-token rotated",
      actorId: "user_owner",
      occurredAt: now,
    });

    expect(updated.timeline).toHaveLength(2);
    expect(JSON.stringify(updated.timeline)).not.toContain("ghp_");
  });
});

describe("incident containment", () => {
  it("quarantines active execution sessions during containment", () => {
    const session = createExecutionSession(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "running",
      },
      { id: "session_1", startedAt: now },
    );

    const quarantined = quarantineExecutionSessionForIncident(session, now);

    expect(quarantined.state).toBe("quarantined");
    expect(quarantined.endedAt).toEqual(now);
  });

  it("marks containment complete when required actions are recorded", () => {
    const incident = createIncident(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        severity: "high",
        summary: "Sandbox escape attempt detected",
        declaredBy: "user_owner",
      },
      { id: "incident_1", declaredAt: now },
    );

    const containing = beginIncidentContainment(incident, {
      actorId: "user_owner",
      occurredAt: now,
      completedActions: DEFAULT_INCIDENT_CONTAINMENT_ACTIONS.map((action) => ({
        action,
        status: "completed" as const,
        evidence: `${action} completed`,
        completedAt: now,
      })),
      suspendedExecutionSessionIds: ["session_1"],
      revokedCredentialRefs: ["SECRET_REF:github-installation-token"],
    });

    expect(containing.status).toBe("contained");
    expect(evaluateContainmentReadiness(containing).ready).toBe(true);
  });
});
