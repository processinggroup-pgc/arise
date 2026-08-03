import {
  InMemoryProjectStore,
  InMemoryWorkItemStore,
  PostgresProjectStore,
  PostgresWorkItemStore,
  type ProjectStore,
  type WorkItemStore,
} from "@arise/application";

import { getDatabasePool, hasDatabaseUrl } from "./database";

let projectStore: ProjectStore | undefined;
let workItemStore: WorkItemStore | undefined;

export function getProjectStore(): ProjectStore {
  projectStore ??= hasDatabaseUrl()
    ? new PostgresProjectStore(getDatabasePool())
    : new InMemoryProjectStore();

  return projectStore;
}

export function getWorkItemStore(): WorkItemStore {
  workItemStore ??= hasDatabaseUrl()
    ? new PostgresWorkItemStore(getDatabasePool())
    : new InMemoryWorkItemStore();

  return workItemStore;
}

export function usesPersistentDataStore(): boolean {
  return hasDatabaseUrl();
}
