import {
  appendIncidentTimelineEvent,
  AUDIT_EVENT_TYPES,
  beginIncidentContainment,
  canSuspendExecutionSession,
  DEFAULT_INCIDENT_CONTAINMENT_ACTIONS,
  quarantineExecutionSessionForIncident,
  type ContainmentActionType,
  type Incident,
  type IncidentContainmentAction,
  type TenantContext,
} from "@arise/domain";

import { recordAuditEvent } from "../audit/record-audit-event.js";
import type { AuditStore } from "../audit/audit-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { ExecutionSessionStore } from "../execution/execution-session-store.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { IncidentStore } from "./incident-store.js";

export interface BeginIncidentContainmentCommand {
  tenantContext: TenantContext;
  incidentId: string;
  credentialRefsToRevoke: string[];
}

export interface BeginIncidentContainmentResult {
  incident: Incident;
  suspendedExecutionSessionIds: string[];
}

export class IncidentContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncidentContainmentError";
  }
}

function buildCompletedContainmentActions(input: {
  suspendedExecutionSessionIds: string[];
  revokedCredentialRefs: string[];
  occurredAt: Date;
}): IncidentContainmentAction[] {
  const evidenceByAction: Record<ContainmentActionType, string> = {
    suspend_execution: `Suspended execution sessions: ${input.suspendedExecutionSessionIds.join(", ") || "none"}`,
    revoke_credentials: `Revoked credentials: ${input.revokedCredentialRefs.join(", ") || "none"}`,
    quarantine_sandbox: "Sandbox sessions quarantined",
    freeze_repository_writes: "Repository writes frozen for affected work item",
    preserve_evidence: "Execution and audit evidence preserved",
  };

  return DEFAULT_INCIDENT_CONTAINMENT_ACTIONS.map((action) => ({
    action,
    status: "completed" as const,
    evidence: evidenceByAction[action],
    completedAt: input.occurredAt,
  }));
}

export async function beginIncidentContainmentForOrganization(
  command: BeginIncidentContainmentCommand,
  incidentStore: IncidentStore,
  executionSessionStore: ExecutionSessionStore,
  auditStore: AuditStore,
  operationContext: IdentityOperationContext,
): Promise<BeginIncidentContainmentResult> {
  const incident = await incidentStore.findIncidentById(command.incidentId);
  if (incident === undefined) {
    throw new AgentRunScopeError("Incident was not found");
  }

  if (incident.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Incident is outside the tenant scope");
  }

  if (incident.workItemId === undefined) {
    throw new IncidentContainmentError("Incident work item scope is required for containment");
  }

  const credentialRefsToRevoke = command.credentialRefsToRevoke
    .map((credentialRef) => credentialRef.trim())
    .filter((credentialRef) => credentialRef.length > 0);

  if (credentialRefsToRevoke.length === 0) {
    throw new IncidentContainmentError("At least one credential reference must be revoked");
  }

  const sessions = await executionSessionStore.listExecutionSessionsForWorkItem(
    incident.workItemId,
  );
  const suspendedExecutionSessionIds: string[] = [];

  for (const session of sessions) {
    if (!canSuspendExecutionSession(session)) {
      continue;
    }

    const quarantined = quarantineExecutionSessionForIncident(session, operationContext.now());
    await executionSessionStore.saveExecutionSession(quarantined);
    suspendedExecutionSessionIds.push(quarantined.id);
  }

  if (suspendedExecutionSessionIds.length === 0) {
    throw new IncidentContainmentError("No active execution sessions were available to suspend");
  }

  const containing = appendIncidentTimelineEvent(incident, {
    id: operationContext.createId(),
    type: "containment_started",
    summary: "Incident containment started",
    actorId: command.tenantContext.userId,
    occurredAt: operationContext.now(),
  });

  await incidentStore.saveIncident({
    ...containing,
    status: "containing",
  });

  const contained = beginIncidentContainment(containing, {
    actorId: command.tenantContext.userId,
    occurredAt: operationContext.now(),
    completedActions: buildCompletedContainmentActions({
      suspendedExecutionSessionIds,
      revokedCredentialRefs: credentialRefsToRevoke,
      occurredAt: operationContext.now(),
    }),
    suspendedExecutionSessionIds,
    revokedCredentialRefs: credentialRefsToRevoke,
  });

  await incidentStore.saveIncident(contained);

  await recordAuditEvent(
    {
      tenantContext: command.tenantContext,
      eventType: AUDIT_EVENT_TYPES.incidentContainmentBegan,
      subject: contained.id,
      payload: {
        incidentId: contained.id,
        suspendedExecutionSessionIds,
        revokedCredentialRefs: credentialRefsToRevoke,
      },
      actorType: "user",
    },
    auditStore,
    operationContext,
  );

  return {
    incident: contained,
    suspendedExecutionSessionIds,
  };
}
