import type { TechnicalDebtItem } from "@arise/domain";

export interface TechnicalDebtStore {
  saveTechnicalDebtItem(item: TechnicalDebtItem): Promise<void>;
  findTechnicalDebtItemById(id: string): Promise<TechnicalDebtItem | undefined>;
  listTechnicalDebtForProject(projectId: string): Promise<TechnicalDebtItem[]>;
  listTechnicalDebtForWorkItem(sourceWorkItemId: string): Promise<TechnicalDebtItem[]>;
}
