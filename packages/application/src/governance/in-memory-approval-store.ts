import type { Approval } from "@arise/domain";

import type { ApprovalStore } from "./approval-store.js";

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly approvals = new Map<string, Approval>();

  saveApproval(approval: Approval): Promise<void> {
    this.approvals.set(approval.id, approval);
    return Promise.resolve();
  }

  findApprovalById(approvalId: string): Promise<Approval | undefined> {
    return Promise.resolve(this.approvals.get(approvalId));
  }

  listApprovalsForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<Approval[]> {
    return Promise.resolve(
      [...this.approvals.values()].filter(
        (approval) =>
          approval.organizationId === organizationId &&
          approval.subjectType === subjectType &&
          approval.subjectId === subjectId,
      ),
    );
  }
}
