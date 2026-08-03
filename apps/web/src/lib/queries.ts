import type { Organization, Project, WorkItem, WorkItemState } from "@arise/domain";
import { isTerminalWorkItemState } from "@arise/domain";

import { ensureDemoData, DEMO_ORG_ID, DEMO_PROJECT_ID } from "./demo-data.js";
import { getIdentityStore } from "./identity-store.js";
import { getProjectStore, getWorkItemStore } from "./stores.js";

export interface DashboardStats {
  total: number;
  inProgress: number;
  awaitingApproval: number;
  released: number;
}

export interface DashboardData {
  organization: Organization;
  project: Project;
  workItems: WorkItem[];
  stats: DashboardStats;
}

function computeStats(workItems: WorkItem[]): DashboardStats {
  const awaitingApprovalStates: WorkItemState[] = [
    "recommendation_pending",
    "release_review",
  ];

  return {
    total: workItems.length,
    inProgress: workItems.filter(
      (workItem) =>
        !isTerminalWorkItemState(workItem.state) &&
        !awaitingApprovalStates.includes(workItem.state),
    ).length,
    awaitingApproval: workItems.filter((workItem) =>
      awaitingApprovalStates.includes(workItem.state),
    ).length,
    released: workItems.filter((workItem) => workItem.state === "released").length,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  await ensureDemoData();

  const organization = await getIdentityStore().findOrganizationById(DEMO_ORG_ID);
  const project = await getProjectStore().findProjectById(DEMO_PROJECT_ID);
  const workItems = await getWorkItemStore().listWorkItemsForProject(DEMO_PROJECT_ID);

  if (organization === undefined || project === undefined) {
    throw new Error("Demo workspace data is unavailable");
  }

  return {
    organization,
    project,
    workItems,
    stats: computeStats(workItems),
  };
}

export async function getWorkItemById(workItemId: string): Promise<{
  organization: Organization;
  project: Project;
  workItem: WorkItem;
} | null> {
  await ensureDemoData();

  const workItem = await getWorkItemStore().findWorkItemVersionById(workItemId);
  if (workItem === undefined) {
    return null;
  }

  const organization = await getIdentityStore().findOrganizationById(workItem.organizationId);
  const project = await getProjectStore().findProjectById(workItem.projectId);

  if (organization === undefined || project === undefined) {
    return null;
  }

  return {
    organization,
    project,
    workItem,
  };
}
