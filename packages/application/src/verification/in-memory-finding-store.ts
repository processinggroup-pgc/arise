import type { Finding } from "@arise/domain";

import type { FindingStore } from "./finding-store.js";

export class InMemoryFindingStore implements FindingStore {
  private readonly findings = new Map<string, Finding>();

  saveFinding(finding: Finding): Promise<void> {
    this.findings.set(finding.id, finding);
    return Promise.resolve();
  }

  findFindingById(id: string): Promise<Finding | undefined> {
    return Promise.resolve(this.findings.get(id));
  }

  listFindingsForWorkItem(workItemId: string): Promise<Finding[]> {
    return Promise.resolve(
      [...this.findings.values()]
        .filter((finding) => finding.workItemId === workItemId)
        .sort((left, right) => left.raisedAt.getTime() - right.raisedAt.getTime()),
    );
  }
}
