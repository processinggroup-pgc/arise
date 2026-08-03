import { InMemoryAuditStore, type AuditStore } from "@arise/application";

const auditStore: AuditStore = new InMemoryAuditStore();

export function getAuditStore(): AuditStore {
  return auditStore;
}
