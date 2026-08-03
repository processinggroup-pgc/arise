import type { WorkItemOutcome } from "@arise/domain";

export interface WorkItemOutcomeStore {
  saveWorkItemOutcome(outcome: WorkItemOutcome): Promise<void>;
  findWorkItemOutcomeById(id: string): Promise<WorkItemOutcome | undefined>;
  listWorkItemOutcomesForWorkItem(workItemId: string): Promise<WorkItemOutcome[]>;
}
