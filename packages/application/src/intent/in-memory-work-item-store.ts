import type { WorkItem } from "@arise/domain";

import type { WorkItemStore } from "./work-item-store.js";

export class InMemoryWorkItemStore implements WorkItemStore {
  private readonly versions = new Map<string, WorkItem>();

  saveWorkItemVersion(workItem: WorkItem): Promise<void> {
    this.versions.set(workItem.id, workItem);
    return Promise.resolve();
  }

  findWorkItemVersionById(id: string): Promise<WorkItem | undefined> {
    return Promise.resolve(this.versions.get(id));
  }

  findLatestByLineageId(lineageId: string): Promise<WorkItem | undefined> {
    const lineageVersions = [...this.versions.values()]
      .filter((workItem) => workItem.lineageId === lineageId)
      .sort((left, right) => right.version - left.version);

    return Promise.resolve(lineageVersions[0]);
  }

  listVersionsByLineageId(lineageId: string): Promise<WorkItem[]> {
    return Promise.resolve(
      [...this.versions.values()]
        .filter((workItem) => workItem.lineageId === lineageId)
        .sort((left, right) => left.version - right.version),
    );
  }

  listWorkItemsForProject(projectId: string): Promise<WorkItem[]> {
    const latestByLineage = new Map<string, WorkItem>();

    for (const workItem of this.versions.values()) {
      if (workItem.projectId !== projectId) {
        continue;
      }

      const currentLatest = latestByLineage.get(workItem.lineageId);
      if (currentLatest === undefined || workItem.version > currentLatest.version) {
        latestByLineage.set(workItem.lineageId, workItem);
      }
    }

    return Promise.resolve(
      [...latestByLineage.values()].sort((left, right) => left.title.localeCompare(right.title)),
    );
  }
}
