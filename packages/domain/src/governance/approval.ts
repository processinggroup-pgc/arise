export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired", "revoked"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_TYPES = [
  "plan_approval",
  "release_approval",
  "security_approval",
  "production_promotion",
] as const;

export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export interface Approval {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  approvalType: ApprovalType;
  requestedFrom: string;
  status: ApprovalStatus;
  expiresAt: Date | null;
  decidedBy: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}

export interface CreateApprovalInput {
  organizationId: string;
  subjectType: string;
  subjectId: string;
  approvalType: string;
  requestedFrom: string;
  expiresAt?: Date | null;
}

export interface CreateApprovalMetadata {
  id: string;
  createdAt: Date;
}

export interface DecideApprovalInput {
  decision: "approved" | "rejected";
  decidedBy: string;
  decidedAt: Date;
}

function assertApprovalType(approvalType: string): ApprovalType {
  if (!(APPROVAL_TYPES as readonly string[]).includes(approvalType)) {
    throw new Error("Approval type is invalid");
  }

  return approvalType as ApprovalType;
}

function assertApprovalStatus(status: string): ApprovalStatus {
  if (!(APPROVAL_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Approval status is invalid");
  }

  return status as ApprovalStatus;
}

export class ApprovalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalStateError";
  }
}

export function createApproval(
  input: CreateApprovalInput,
  metadata: CreateApprovalMetadata,
): Approval {
  const organizationId = input.organizationId.trim();
  const subjectType = input.subjectType.trim();
  const subjectId = input.subjectId.trim();
  const requestedFrom = input.requestedFrom.trim();

  if (organizationId.length === 0 || subjectType.length === 0 || subjectId.length === 0) {
    throw new Error("Approval subject is required");
  }

  if (requestedFrom.length === 0) {
    throw new Error("Approval requester is required");
  }

  return {
    id: metadata.id,
    organizationId,
    subjectType,
    subjectId,
    approvalType: assertApprovalType(input.approvalType),
    requestedFrom,
    status: "pending",
    expiresAt: input.expiresAt ?? null,
    decidedBy: null,
    createdAt: metadata.createdAt,
    decidedAt: null,
  };
}

export function decideApproval(approval: Approval, input: DecideApprovalInput): Approval {
  if (approval.status !== "pending") {
    throw new ApprovalStateError("Only pending approvals can be decided");
  }

  if (approval.expiresAt !== null && input.decidedAt.getTime() > approval.expiresAt.getTime()) {
    throw new ApprovalStateError("Approval has expired");
  }

  const decidedBy = input.decidedBy.trim();
  if (decidedBy.length === 0) {
    throw new Error("Approval decision actor is required");
  }

  return {
    ...approval,
    status: input.decision === "approved" ? "approved" : "rejected",
    decidedBy,
    decidedAt: input.decidedAt,
  };
}

export function expireApproval(approval: Approval, expiredAt: Date): Approval {
  if (approval.status !== "pending") {
    throw new ApprovalStateError("Only pending approvals can expire");
  }

  return {
    ...approval,
    status: assertApprovalStatus("expired"),
    decidedAt: expiredAt,
  };
}

export function isApprovalActive(approval: Approval, at: Date): boolean {
  if (approval.status !== "approved") {
    return false;
  }

  if (approval.expiresAt !== null && at.getTime() > approval.expiresAt.getTime()) {
    return false;
  }

  return true;
}
