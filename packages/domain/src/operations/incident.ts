export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ["declared", "containing", "contained", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const CONTAINMENT_ACTION_TYPES = [
  "suspend_execution",
  "revoke_credentials",
  "quarantine_sandbox",
  "freeze_repository_writes",
  "preserve_evidence",
] as const;
export type ContainmentActionType = (typeof CONTAINMENT_ACTION_TYPES)[number];

export const CONTAINMENT_ACTION_STATUSES = ["planned", "completed", "failed"] as const;
export type ContainmentActionStatus = (typeof CONTAINMENT_ACTION_STATUSES)[number];

export const DEFAULT_INCIDENT_CONTAINMENT_ACTIONS: ContainmentActionType[] = [
  "suspend_execution",
  "revoke_credentials",
  "quarantine_sandbox",
  "preserve_evidence",
];

export interface IncidentTimelineEvent {
  id: string;
  type: string;
  summary: string;
  actorId: string;
  occurredAt: Date;
}

export interface IncidentContainmentAction {
  action: ContainmentActionType;
  status: ContainmentActionStatus;
  evidence: string;
  completedAt?: Date;
}

export interface Incident {
  id: string;
  organizationId: string;
  workItemId?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  summary: string;
  timeline: IncidentTimelineEvent[];
  containment: IncidentContainmentAction[];
  suspendedExecutionSessionIds: string[];
  revokedCredentialRefs: string[];
  declaredAt: Date;
  containedAt?: Date;
}

export interface CreateIncidentInput {
  organizationId: string;
  workItemId?: string;
  severity: string;
  summary: string;
  declaredBy: string;
}

export interface CreateIncidentMetadata {
  id: string;
  declaredAt: Date;
}

export interface AppendIncidentTimelineEventInput {
  id: string;
  type: string;
  summary: string;
  actorId: string;
  occurredAt: Date;
}

export interface BeginIncidentContainmentInput {
  actorId: string;
  occurredAt: Date;
  completedActions: IncidentContainmentAction[];
  suspendedExecutionSessionIds: string[];
  revokedCredentialRefs: string[];
}

export interface ContainmentReadinessEvaluation {
  ready: boolean;
  blockers: string[];
}

function assertIncidentSeverity(severity: string): IncidentSeverity {
  if (!(INCIDENT_SEVERITIES as readonly string[]).includes(severity)) {
    throw new Error("Incident severity is invalid");
  }

  return severity as IncidentSeverity;
}

function assertIncidentStatus(status: string): IncidentStatus {
  if (!(INCIDENT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Incident status is invalid");
  }

  return status as IncidentStatus;
}

function assertContainmentActionType(action: string): ContainmentActionType {
  if (!(CONTAINMENT_ACTION_TYPES as readonly string[]).includes(action)) {
    throw new Error("Containment action type is invalid");
  }

  return action as ContainmentActionType;
}

function assertContainmentActionStatus(status: string): ContainmentActionStatus {
  if (!(CONTAINMENT_ACTION_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Containment action status is invalid");
  }

  return status as ContainmentActionStatus;
}

function normalizeContainmentAction(action: IncidentContainmentAction): IncidentContainmentAction {
  const normalized: IncidentContainmentAction = {
    action: assertContainmentActionType(action.action),
    status: assertContainmentActionStatus(action.status),
    evidence: action.evidence.trim(),
  };

  if (normalized.evidence.length === 0) {
    throw new Error("Containment action evidence is required");
  }

  if (action.completedAt !== undefined) {
    normalized.completedAt = action.completedAt;
  }

  return normalized;
}

function buildPlannedContainmentActions(): IncidentContainmentAction[] {
  return DEFAULT_INCIDENT_CONTAINMENT_ACTIONS.map((action) => ({
    action,
    status: "planned",
    evidence: "Pending incident containment",
  }));
}

export function createIncident(input: CreateIncidentInput, metadata: CreateIncidentMetadata): Incident {
  const organizationId = input.organizationId.trim();
  const summary = input.summary.trim();
  const declaredBy = input.declaredBy.trim();
  const workItemId = input.workItemId?.trim();

  if (organizationId.length === 0 || summary.length === 0 || declaredBy.length === 0) {
    throw new Error("Incident declaration fields are required");
  }

  return {
    id: metadata.id,
    organizationId,
    ...(workItemId !== undefined && workItemId.length > 0 ? { workItemId } : {}),
    severity: assertIncidentSeverity(input.severity),
    status: "declared",
    summary,
    timeline: [
      {
        id: `${metadata.id}_timeline_declared`,
        type: "incident_declared",
        summary,
        actorId: declaredBy,
        occurredAt: metadata.declaredAt,
      },
    ],
    containment: buildPlannedContainmentActions(),
    suspendedExecutionSessionIds: [],
    revokedCredentialRefs: [],
    declaredAt: metadata.declaredAt,
  };
}

export function appendIncidentTimelineEvent(
  incident: Incident,
  event: AppendIncidentTimelineEventInput,
): Incident {
  const normalizedSummary = event.summary.trim();
  const actorId = event.actorId.trim();
  const type = event.type.trim();

  if (normalizedSummary.length === 0 || actorId.length === 0 || type.length === 0) {
    throw new Error("Incident timeline event fields are required");
  }

  return {
    ...incident,
    timeline: [
      ...incident.timeline,
      {
        id: event.id,
        type,
        summary: normalizedSummary,
        actorId,
        occurredAt: event.occurredAt,
      },
    ],
  };
}

export function evaluateContainmentReadiness(incident: Incident): ContainmentReadinessEvaluation {
  const blockers: string[] = [];

  for (const action of DEFAULT_INCIDENT_CONTAINMENT_ACTIONS) {
    const recorded = incident.containment.find((entry) => entry.action === action);
    if (recorded === undefined || recorded.status !== "completed") {
      blockers.push(`Containment action ${action} is incomplete`);
    }
  }

  if (incident.suspendedExecutionSessionIds.length === 0) {
    blockers.push("No execution sessions were suspended");
  }

  if (incident.revokedCredentialRefs.length === 0) {
    blockers.push("No temporary credentials were revoked");
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

export function beginIncidentContainment(
  incident: Incident,
  input: BeginIncidentContainmentInput,
): Incident {
  if (incident.status !== "declared" && incident.status !== "containing") {
    throw new Error("Incident containment cannot begin from the current status");
  }

  const actorId = input.actorId.trim();
  if (actorId.length === 0) {
    throw new Error("Incident containment actor is required");
  }

  const completedActions = input.completedActions.map(normalizeContainmentAction);
  const suspendedExecutionSessionIds = input.suspendedExecutionSessionIds
    .map((sessionId) => sessionId.trim())
    .filter((sessionId) => sessionId.length > 0);
  const revokedCredentialRefs = input.revokedCredentialRefs
    .map((credentialRef) => credentialRef.trim())
    .filter((credentialRef) => credentialRef.length > 0);

  if (completedActions.some((action) => action.status !== "completed")) {
    throw new Error("Incident containment requires completed actions");
  }

  const withTimeline = appendIncidentTimelineEvent(incident, {
    id: `${incident.id}_timeline_containment`,
    type: "containment_completed",
    summary: "Incident containment completed",
    actorId,
    occurredAt: input.occurredAt,
  });

  const contained: Incident = {
    ...withTimeline,
    status: assertIncidentStatus("contained"),
    containment: completedActions,
    suspendedExecutionSessionIds,
    revokedCredentialRefs,
    containedAt: input.occurredAt,
  };

  const readiness = evaluateContainmentReadiness(contained);
  if (!readiness.ready) {
    throw new Error(readiness.blockers.join("; "));
  }

  return contained;
}
