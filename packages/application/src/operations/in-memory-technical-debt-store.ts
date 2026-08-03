import type { TechnicalDebtItem } from "@arise/domain";

import type { TechnicalDebtStore } from "./technical-debt-store.js";

export class InMemoryTechnicalDebtStore implements TechnicalDebtStore {
  private readonly items = new Map<string, TechnicalDebtItem>();

  saveTechnicalDebtItem(item: TechnicalDebtItem): Promise<void> {
    this.items.set(item.id, item);
    return Promise.resolve();
  }

  findTechnicalDebtItemById(id: string): Promise<TechnicalDebtItem | undefined> {
    return Promise.resolve(this.items.get(id));
  }

  listTechnicalDebtForProject(projectId: string): Promise<TechnicalDebtItem[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.projectId === projectId),
    );
  }

  listTechnicalDebtForWorkItem(sourceWorkItemId: string): Promise<TechnicalDebtItem[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.sourceWorkItemId === sourceWorkItemId),
    );
  }
}
