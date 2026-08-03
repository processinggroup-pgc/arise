import {
  createApproval,
  decideApproval,
  evaluatePolicyAction,
  isApprovalActive,
  mapWorkItemRiskLevelToPolicyClass,
  type Approval,
  type PolicyDecision,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ApprovalStore } from "./approval-store.js";

export interface RequestApprovalCommand {
  tenantContext: TenantContext;
  subjectType: string;
  subjectId: string;
  approvalType: string;
  expiresAt?: Date;
}

export interface DecideApprovalCommand {
  tenantContext: TenantContext;
  approvalId: string;
  decision: "approved" | "rejected";
}

export class PolicyBlockedError extends Error {
  constructor(
    message: string,
    readonly policyDecision: PolicyDecision,
  ) {
    super(message);
    this.name = "PolicyBlockedError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(
    message: string,
    readonly policyDecision: PolicyDecision,
  ) {
    super(message);
    this.name = "ApprovalRequiredError";
  }
}

export class ApprovalScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalScopeError";
  }
}

export async function requestApproval(
  command: RequestApprovalCommand,
  store: ApprovalStore,
  context: IdentityOperationContext,
): Promise<Approval> {
  const approval = createApproval(
    {
      organizationId: command.tenantContext.organizationId,
      subjectType: command.subjectType,
      subjectId: command.subjectId,
      approvalType: command.approvalType,
      requestedFrom: command.tenantContext.userId,
      ...(command.expiresAt !== undefined ? { expiresAt: command.expiresAt } : {}),
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await store.saveApproval(approval);
  return approval;
}

export async function decideApprovalRequest(
  command: DecideApprovalCommand,
  store: ApprovalStore,
  context: IdentityOperationContext,
): Promise<Approval> {
  const approval = await store.findApprovalById(command.approvalId);
  if (approval === undefined) {
    throw new ApprovalScopeError("Approval was not found");
  }

  if (approval.organizationId !== command.tenantContext.organizationId) {
    throw new ApprovalScopeError("Approval is outside the tenant scope");
  }

  const decided = decideApproval(approval, {
    decision: command.decision,
    decidedBy: command.tenantContext.userId,
    decidedAt: context.now(),
  });

  await store.saveApproval(decided);
  return decided;
}

export function evaluateActionPolicy(input: {
  actionType: Parameters<typeof evaluatePolicyAction>[0]["actionType"];
  workItemRiskLevel?: string;
  productionTarget?: boolean;
  planApproved?: boolean;
}): PolicyDecision {
  return evaluatePolicyAction({
    actionType: input.actionType,
    ...(input.workItemRiskLevel !== undefined
      ? {
          workItemRiskLevel: input.workItemRiskLevel,
          riskClass: mapWorkItemRiskLevelToPolicyClass(input.workItemRiskLevel),
        }
      : {}),
    ...(input.productionTarget !== undefined ? { productionTarget: input.productionTarget } : {}),
    ...(input.planApproved !== undefined ? { planApproved: input.planApproved } : {}),
  });
}

export async function assertRequiredApprovals(
  policyDecision: PolicyDecision,
  organizationId: string,
  subjectType: string,
  subjectId: string,
  store: ApprovalStore,
  at: Date,
): Promise<void> {
  if (policyDecision.decision === "blocked") {
    throw new PolicyBlockedError(policyDecision.reasons.join("; "), policyDecision);
  }

  if (policyDecision.decision !== "approval_required") {
    return;
  }

  const approvals = await store.listApprovalsForSubject(organizationId, subjectType, subjectId);
  const missingApprovalTypes = policyDecision.requiredApprovalTypes.filter(
    (approvalType) =>
      !approvals.some(
        (approval) => approval.approvalType === approvalType && isApprovalActive(approval, at),
      ),
  );

  if (missingApprovalTypes.length > 0) {
    throw new ApprovalRequiredError(
      `Missing approvals: ${missingApprovalTypes.join(", ")}`,
      policyDecision,
    );
  }
}
