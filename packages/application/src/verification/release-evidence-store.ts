import type { ReleaseEvidence } from "@arise/domain";

export interface ReleaseEvidenceStore {
  saveReleaseEvidence(evidence: ReleaseEvidence): Promise<void>;
  findReleaseEvidenceById(id: string): Promise<ReleaseEvidence | undefined>;
  listReleaseEvidenceForWorkItem(workItemId: string): Promise<ReleaseEvidence[]>;
}
