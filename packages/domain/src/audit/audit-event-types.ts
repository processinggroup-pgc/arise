export const AUDIT_ACTOR_TYPES = ["user", "system", "service"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_EVENT_TYPES = {
  tenantScopeViolation: "tenant_scope_violation",
  incidentDeclared: "incident_declared",
  incidentContainmentBegan: "incident_containment_began",
} as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];
