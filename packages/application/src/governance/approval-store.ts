import type { Approval } from "@arise/domain";

export interface ApprovalStore {
  saveApproval(approval: Approval): Promise<void>;
  findApprovalById(approvalId: string): Promise<Approval | undefined>;
  listApprovalsForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<Approval[]>;
}
