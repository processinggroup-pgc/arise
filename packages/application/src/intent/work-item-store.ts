import type { WorkItem } from "@arise/domain";

export interface WorkItemStore {
  saveWorkItemVersion(workItem: WorkItem): Promise<void>;
  findWorkItemVersionById(id: string): Promise<WorkItem | undefined>;
  findLatestByLineageId(lineageId: string): Promise<WorkItem | undefined>;
  listVersionsByLineageId(lineageId: string): Promise<WorkItem[]>;
  listWorkItemsForProject(projectId: string): Promise<WorkItem[]>;
}
