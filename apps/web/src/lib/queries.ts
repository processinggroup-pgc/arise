import type { Organization, Project, WorkItem, WorkItemState } from "@arise/domain";
import { isTerminalWorkItemState } from "@arise/domain";

import { ensureDemoData, DEMO_ORG_ID, DEMO_PROJECT_ID } from "./demo-data";
import { getIdentityStore, usesPersistentIdentityStore } from "./identity-store";
import { getWorkspaceSession } from "./session";
import { getProjectStore, getWorkItemStore } from "./stores";

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

interface WorkspaceContext {
  organizationId: string;
  projectId: string;
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

async function resolveWorkspaceContext(): Promise<WorkspaceContext | null> {
  const session = await getWorkspaceSession();

  if (session.organizationId !== undefined) {
    const projects = await getProjectStore().listProjectsForOrganization(session.organizationId);
    const project = projects[0];
    if (project === undefined) {
      return null;
    }

    return {
      organizationId: session.organizationId,
      projectId: project.id,
    };
  }

  if (!usesPersistentIdentityStore()) {
    await ensureDemoData();
    return {
      organizationId: DEMO_ORG_ID,
      projectId: DEMO_PROJECT_ID,
    };
  }

  return null;
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
