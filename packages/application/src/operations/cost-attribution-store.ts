import type { CostAttributionRecord } from "@arise/domain";

export interface CostAttributionStore {
  saveCostAttribution(attribution: CostAttributionRecord): Promise<void>;
  findCostAttributionById(id: string): Promise<CostAttributionRecord | undefined>;
  listCostAttributionsForWorkItem(workItemId: string): Promise<CostAttributionRecord[]>;
}
