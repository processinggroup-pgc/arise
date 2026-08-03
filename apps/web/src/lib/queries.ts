import type { Organization, Project, WorkItem, WorkItemState } from "@arise/domain";
import { isTerminalWorkItemState } from "@arise/domain";

import { hasDatabaseUrl } from "./database";
import { getIdentityStore } from "./identity-store";
import { createWorkspaceTenantContext, runWithTenantScopedStores } from "./postgres-tenant";
import { runSafely } from "./postgres-support";
import { getWorkspaceSession } from "./session";
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

async function listWorkItemsForWorkspaceProject(
  organizationId: string,
  userId: string,
  projectId: string,
): Promise<WorkItem[]> {
  if (hasDatabaseUrl()) {
    const tenantContext = createWorkspaceTenantContext({ organizationId, userId });
    return runWithTenantScopedStores(tenantContext, async (stores) =>
      stores.workItemStore.listWorkItemsForProject(projectId),
    );
  }

  return getWorkItemStore().listWorkItemsForProject(projectId);
}

export async function getDashboardData(): Promise<DashboardData | null> {
  return runSafely(
    async () => {
      const workspace = await resolveWorkspaceContext();
      if (workspace === null) {
        return null;
      }

      const { userId } = await getWorkspaceSession();
      const tenantContext = createWorkspaceTenantContext({
        organizationId: workspace.organizationId,
        userId,
      });

      const organization = await getIdentityStore().findOrganizationById(workspace.organizationId);
      const project = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.projectStore.findProjectById(workspace.projectId),
          )
        : await getProjectStore().findProjectById(workspace.projectId);
      const workItems = await listWorkItemsForWorkspaceProject(
        workspace.organizationId,
        userId,
        workspace.projectId,
      );

      if (organization === undefined || project === undefined) {
        return null;
      }

      return {
        organization,
        project,
        workItems,
        stats: computeStats(workItems),
      };
    },
    null,
    "getDashboardData",
  );
}

export async function getWorkItemById(workItemId: string): Promise<{
  organization: Organization;
  project: Project;
  workItem: WorkItem;
} | null> {
  return runSafely(
    async () => {
      const workspace = await resolveWorkspaceContext();
      if (workspace === null) {
        return null;
      }

      const { userId } = await getWorkspaceSession();
      const tenantContext = createWorkspaceTenantContext({
        organizationId: workspace.organizationId,
        userId,
      });

      const workItem = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.workItemStore.findWorkItemVersionById(workItemId),
          )
        : await getWorkItemStore().findWorkItemVersionById(workItemId);

      if (workItem === undefined || workItem.organizationId !== workspace.organizationId) {
        return null;
      }

      const organization = await getIdentityStore().findOrganizationById(workItem.organizationId);
      const project = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.projectStore.findProjectById(workItem.projectId),
          )
        : await getProjectStore().findProjectById(workItem.projectId);

      if (organization === undefined || project === undefined) {
        return null;
      }

      return {
        organization,
        project,
        workItem,
      };
    },
    null,
    "getWorkItemById",
  );
}
