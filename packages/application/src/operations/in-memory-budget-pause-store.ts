import type { BudgetPause } from "@arise/domain";

import type { BudgetPauseStore } from "./budget-pause-store.js";

export class InMemoryBudgetPauseStore implements BudgetPauseStore {
  private readonly pauses = new Map<string, BudgetPause>();

  saveBudgetPause(pause: BudgetPause): Promise<void> {
    this.pauses.set(pause.id, pause);
    return Promise.resolve();
  }

  findBudgetPauseById(id: string): Promise<BudgetPause | undefined> {
    return Promise.resolve(this.pauses.get(id));
  }

  findActiveBudgetPauseForWorkItem(workItemId: string): Promise<BudgetPause | undefined> {
    return Promise.resolve(
      [...this.pauses.values()].find(
        (pause) => pause.workItemId === workItemId && pause.status === "active",
      ),
    );
  }
}
