import type { CostAttributionRecord } from "@arise/domain";

import type { CostAttributionStore } from "./cost-attribution-store.js";

export class InMemoryCostAttributionStore implements CostAttributionStore {
  private readonly records = new Map<string, CostAttributionRecord>();

  saveCostAttribution(attribution: CostAttributionRecord): Promise<void> {
    this.records.set(attribution.id, attribution);
    return Promise.resolve();
  }

  findCostAttributionById(id: string): Promise<CostAttributionRecord | undefined> {
    return Promise.resolve(this.records.get(id));
  }

  listCostAttributionsForWorkItem(workItemId: string): Promise<CostAttributionRecord[]> {
    return Promise.resolve(
      [...this.records.values()].filter((record) => record.workItemId === workItemId),
    );
  }
}
