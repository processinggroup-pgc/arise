import type { AuditEvent } from "@arise/domain";

export interface AuditStore {
  appendEvent(event: AuditEvent): Promise<void>;
  listEventsForOrganization(organizationId: string): Promise<AuditEvent[]>;
}
