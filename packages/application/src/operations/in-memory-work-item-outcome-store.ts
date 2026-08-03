import type { WorkItemOutcome } from "@arise/domain";

import type { WorkItemOutcomeStore } from "./work-item-outcome-store.js";

export class InMemoryWorkItemOutcomeStore implements WorkItemOutcomeStore {
  private readonly outcomes = new Map<string, WorkItemOutcome>();

  saveWorkItemOutcome(outcome: WorkItemOutcome): Promise<void> {
    this.outcomes.set(outcome.id, outcome);
    return Promise.resolve();
  }

  findWorkItemOutcomeById(id: string): Promise<WorkItemOutcome | undefined> {
    return Promise.resolve(this.outcomes.get(id));
  }

  listWorkItemOutcomesForWorkItem(workItemId: string): Promise<WorkItemOutcome[]> {
    return Promise.resolve(
      [...this.outcomes.values()].filter((outcome) => outcome.workItemId === workItemId),
    );
  }
}
