import {
  InMemoryProjectStore,
  InMemoryWorkItemStore,
  type ProjectStore,
  type WorkItemStore,
} from "@arise/application";

const projectStore: ProjectStore = new InMemoryProjectStore();
const workItemStore: WorkItemStore = new InMemoryWorkItemStore();

export function getProjectStore(): ProjectStore {
  return projectStore;
}

export function getWorkItemStore(): WorkItemStore {
  return workItemStore;
}
