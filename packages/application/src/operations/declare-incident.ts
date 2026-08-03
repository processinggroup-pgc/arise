import {
  AUDIT_EVENT_TYPES,
  createIncident,
  type Incident,
  type TenantContext,
} from "@arise/domain";

import { recordAuditEvent } from "../audit/record-audit-event.js";
import type { AuditStore } from "../audit/audit-store.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { IncidentStore } from "./incident-store.js";

export interface DeclareIncidentCommand {
  tenantContext: TenantContext;
  severity: string;
  summary: string;
  workItemId?: string;
}

export interface DeclareIncidentResult {
  incident: Incident;
}

export async function declareIncident(
  command: DeclareIncidentCommand,
  incidentStore: IncidentStore,
  auditStore: AuditStore,
  operationContext: IdentityOperationContext,
): Promise<DeclareIncidentResult> {
  const incident = createIncident(
    {
      organizationId: command.tenantContext.organizationId,
      severity: command.severity,
      summary: command.summary,
      declaredBy: command.tenantContext.userId,
      ...(command.workItemId !== undefined ? { workItemId: command.workItemId } : {}),
    },
    {
      id: operationContext.createId(),
      declaredAt: operationContext.now(),
    },
  );

  await incidentStore.saveIncident(incident);

  await recordAuditEvent(
    {
      tenantContext: command.tenantContext,
      eventType: AUDIT_EVENT_TYPES.incidentDeclared,
      subject: incident.id,
      payload: {
        incidentId: incident.id,
        severity: incident.severity,
        workItemId: incident.workItemId,
      },
      actorType: "user",
    },
    auditStore,
    operationContext,
  );

  return { incident };
}
