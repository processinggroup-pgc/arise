import { redactSecrets } from "../security/redact-secrets.js";
import { AUDIT_ACTOR_TYPES, type AuditActorType } from "./audit-event-types.js";

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorType: AuditActorType;
  actorId: string;
  eventType: string;
  subject: string;
  correlationId: string;
  payloadRedacted: string;
  createdAt: Date;
}

export interface CreateAuditEventInput {
  organizationId: string;
  actorType: string;
  actorId: string;
  eventType: string;
  subject: string;
  correlationId: string;
  payload?: unknown;
}

export interface CreateAuditEventMetadata {
  id: string;
  createdAt: Date;
}

function assertActorType(actorType: string): AuditActorType {
  if (!(AUDIT_ACTOR_TYPES as readonly string[]).includes(actorType)) {
    throw new Error("Audit actor type is invalid");
  }

  return actorType as AuditActorType;
}

function serializePayload(payload: unknown): string {
  if (payload === undefined) {
    return "{}";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return JSON.stringify(payload);
}

export function createAuditEvent(
  input: CreateAuditEventInput,
  metadata: CreateAuditEventMetadata,
): AuditEvent {
  const organizationId = input.organizationId.trim();
  const actorId = input.actorId.trim();
  const eventType = input.eventType.trim();
  const subject = input.subject.trim();
  const correlationId = input.correlationId.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (actorId.length === 0) {
    throw new Error("Actor identifier is required");
  }

  if (eventType.length === 0) {
    throw new Error("Event type is required");
  }

  if (subject.length === 0) {
    throw new Error("Subject is required");
  }

  if (correlationId.length === 0) {
    throw new Error("Correlation identifier is required");
  }

  return {
    id: metadata.id,
    organizationId,
    actorType: assertActorType(input.actorType),
    actorId,
    eventType,
    subject,
    correlationId,
    payloadRedacted: redactSecrets(serializePayload(input.payload)),
    createdAt: metadata.createdAt,
  };
}
