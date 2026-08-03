import type { Organization, Project, WorkItem, WorkItemState } from "@arise/domain";
import { isTerminalWorkItemState } from "@arise/domain";

import { getIdentityStore } from "./identity-store";
import { getProjectStore, getWorkItemStore } from "./stores";
import { resolveWorkspaceContext } from "./workspace";

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
  const awaitingApprovalStates: WorkItemState[] = ["recommendation_pending", "release_review"];

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

export async function getDashboardData(): Promise<DashboardData | null> {
  const workspace = await resolveWorkspaceContext();
  if (workspace === null) {
    return null;
  }

  const organization = await getIdentityStore().findOrganizationById(workspace.organizationId);
  const project = await getProjectStore().findProjectById(workspace.projectId);
  const workItems = await getWorkItemStore().listWorkItemsForProject(workspace.projectId);

  if (organization === undefined || project === undefined) {
    return null;
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
  const workspace = await resolveWorkspaceContext();
  if (workspace === null) {
    return null;
  }

  const workItem = await getWorkItemStore().findWorkItemVersionById(workItemId);
  if (workItem === undefined || workItem.organizationId !== workspace.organizationId) {
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
