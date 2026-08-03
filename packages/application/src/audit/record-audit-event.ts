import {
  AUDIT_EVENT_TYPES,
  createAuditEvent,
  type AuditEvent,
  type TenantContext,
} from "@arise/domain";

import type { AuditStore } from "./audit-store.js";

export interface RecordAuditEventCommand {
  tenantContext: TenantContext;
  eventType: string;
  subject: string;
  payload?: unknown;
  actorType?: "user" | "system" | "service";
}

export interface RecordAuditEventContext {
  createId: () => string;
  now: () => Date;
}

export async function recordAuditEvent(
  command: RecordAuditEventCommand,
  store: AuditStore,
  context: RecordAuditEventContext,
): Promise<AuditEvent> {
  const event = createAuditEvent(
    {
      organizationId: command.tenantContext.organizationId,
      actorType: command.actorType ?? "user",
      actorId: command.tenantContext.userId,
      eventType: command.eventType,
      subject: command.subject,
      correlationId: command.tenantContext.correlationId,
      payload: command.payload,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await store.appendEvent(event);
  return event;
}

export async function recordTenantScopeViolation(
  tenantContext: TenantContext,
  requestedOrganizationId: string,
  store: AuditStore,
  context: RecordAuditEventContext,
): Promise<AuditEvent> {
  return recordAuditEvent(
    {
      tenantContext,
      eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
      subject: requestedOrganizationId,
      payload: {
        requestedOrganizationId,
        organizationId: tenantContext.organizationId,
      },
    },
    store,
    context,
  );
}
