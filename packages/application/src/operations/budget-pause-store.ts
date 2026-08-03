import type { BudgetPause } from "@arise/domain";

export interface BudgetPauseStore {
  saveBudgetPause(pause: BudgetPause): Promise<void>;
  findBudgetPauseById(id: string): Promise<BudgetPause | undefined>;
  findActiveBudgetPauseForWorkItem(workItemId: string): Promise<BudgetPause | undefined>;
}
