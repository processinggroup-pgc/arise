import type { AuditEvent } from "@arise/domain";

import type { AuditStore } from "./audit-store.js";

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  appendEvent(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  listEventsForOrganization(organizationId: string): Promise<AuditEvent[]> {
    return Promise.resolve(this.events.filter((event) => event.organizationId === organizationId));
  }
}
