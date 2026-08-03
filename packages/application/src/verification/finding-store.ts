import type { Finding } from "@arise/domain";

export interface FindingStore {
  saveFinding(finding: Finding): Promise<void>;
  findFindingById(id: string): Promise<Finding | undefined>;
  listFindingsForWorkItem(workItemId: string): Promise<Finding[]>;
}
