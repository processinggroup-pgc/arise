import type { ReleaseEvidence } from "@arise/domain";

import type { ReleaseEvidenceStore } from "./release-evidence-store.js";

export class InMemoryReleaseEvidenceStore implements ReleaseEvidenceStore {
  private readonly records = new Map<string, ReleaseEvidence>();

  saveReleaseEvidence(evidence: ReleaseEvidence): Promise<void> {
    this.records.set(evidence.id, evidence);
    return Promise.resolve();
  }

  findReleaseEvidenceById(id: string): Promise<ReleaseEvidence | undefined> {
    return Promise.resolve(this.records.get(id));
  }

  listReleaseEvidenceForWorkItem(workItemId: string): Promise<ReleaseEvidence[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((evidence) => evidence.workItemId === workItemId)
        .sort((left, right) => left.generatedAt.getTime() - right.generatedAt.getTime()),
    );
  }
}
