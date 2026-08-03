import { createProjectForOrganization, listOrganizationsForUser } from "@arise/application";

import { hasDatabaseUrl } from "./database";
import { ensureDemoData, DEMO_ORG_ID, DEMO_PROJECT_ID } from "./demo-data";
import { getIdentityStore, usesPersistentIdentityStore } from "./identity-store";
import { createWorkspaceTenantContext, runWithTenantScopedStores } from "./postgres-tenant";
import { isValidUuid, runSafely } from "./postgres-support";
import { getWorkspaceSession, setWorkspaceSession } from "./session";
import { getProjectStore } from "./stores";

export interface WorkspaceContext {
  organizationId: string;
  projectId: string;
}

export interface ActiveWorkspace {
  userId: string;
  organizationId: string;
}

export async function getActiveWorkspaceForAction(): Promise<ActiveWorkspace | null> {
  const session = await getWorkspaceSession();
  const organizationId = await resolveOrganizationId(session.userId, session.organizationId);

  if (organizationId === null) {
    if (!usesPersistentIdentityStore()) {
      await ensureDemoData();
      return { userId: session.userId, organizationId: DEMO_ORG_ID };
    }

    return null;
  }

  if (session.organizationId !== organizationId) {
    await setWorkspaceSession({ userId: session.userId, organizationId });
  }

  return { userId: session.userId, organizationId };
}

export async function listWorkspaceOrganizations() {
  const session = await getWorkspaceSession();
  if (!isValidUuid(session.userId)) {
    return [];
  }

  return runSafely(
    () => listOrganizationsForUser(session.userId, getIdentityStore()),
    [],
    "listWorkspaceOrganizations",
  );
}

async function ensureDefaultProject(organizationId: string, userId: string): Promise<string> {
  if (hasDatabaseUrl()) {
    const tenantContext = createWorkspaceTenantContext({ organizationId, userId });

    return runWithTenantScopedStores(tenantContext, async (stores) => {
      const projects = await stores.projectStore.listProjectsForOrganization(organizationId);
      const existingProject = projects[0];
      if (existingProject !== undefined) {
        return existingProject.id;
      }

      const project = await createProjectForOrganization(
        {
          tenantContext,
          name: "Default Project",
          description: "Primary delivery workspace for governed agent runs.",
        },
        stores.projectStore,
        {
          createId: () => crypto.randomUUID(),
          now: () => new Date(),
        },
      );

      return project.id;
    });
  }

  const projects = await getProjectStore().listProjectsForOrganization(organizationId);
  const existingProject = projects[0];
  if (existingProject !== undefined) {
    return existingProject.id;
  }

  const tenantContext = createWorkspaceTenantContext({ organizationId, userId });
  const project = await createProjectForOrganization(
    {
      tenantContext,
      name: "Default Project",
      description: "Primary delivery workspace for governed agent runs.",
    },
    getProjectStore(),
    {
      createId: () => crypto.randomUUID(),
      now: () => new Date(),
    },
  );

  return project.id;
}

async function resolveOrganizationId(
  userId: string,
  organizationId: string | undefined,
): Promise<string | null> {
  if (!isValidUuid(userId)) {
    return null;
  }

  const identityStore = getIdentityStore();

  if (organizationId !== undefined) {
    const organization = await identityStore.findOrganizationById(organizationId);
    const membership = await identityStore.findMembership(organizationId, userId);

    if (organization !== undefined && membership !== undefined && membership.status === "active") {
      return organizationId;
    }
  }

  const organizations = await listOrganizationsForUser(userId, identityStore);
  if (organizations.length === 1) {
    const onlyOrganization = organizations[0];
    if (onlyOrganization !== undefined) {
      return onlyOrganization.id;
    }
  }

  return null;
}

export async function resolveWorkspaceContext(): Promise<WorkspaceContext | null> {
  return runSafely(
    async () => {
      const session = await getWorkspaceSession();
      const organizationId = await resolveOrganizationId(session.userId, session.organizationId);

      if (organizationId === null) {
        if (!usesPersistentIdentityStore()) {
          await ensureDemoData();
          return {
            organizationId: DEMO_ORG_ID,
            projectId: DEMO_PROJECT_ID,
          };
        }

        return null;
      }

      const projectId = await ensureDefaultProject(organizationId, session.userId);

      return {
        organizationId,
        projectId,
      };
    },
    null,
    "resolveWorkspaceContext",
  );
}
