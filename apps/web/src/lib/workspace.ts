import { createProjectForOrganization, listOrganizationsForUser } from "@arise/application";
import { createTenantContext } from "@arise/domain";

import { ensureDemoData, DEMO_ORG_ID, DEMO_PROJECT_ID } from "./demo-data";
import { getIdentityStore, usesPersistentIdentityStore } from "./identity-store";
import { clearOrganizationSession, getWorkspaceSession, setWorkspaceSession } from "./session";
import { getProjectStore } from "./stores";

export interface WorkspaceContext {
  organizationId: string;
  projectId: string;
}

export async function listWorkspaceOrganizations() {
  const session = await getWorkspaceSession();
  return listOrganizationsForUser(session.userId, getIdentityStore());
}

async function ensureDefaultProject(organizationId: string, userId: string): Promise<string> {
  const projects = await getProjectStore().listProjectsForOrganization(organizationId);
  const existingProject = projects[0];
  if (existingProject !== undefined) {
    return existingProject.id;
  }

  const tenantContext = createTenantContext({
    organizationId,
    userId,
    correlationId: crypto.randomUUID(),
  });

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
  const identityStore = getIdentityStore();

  if (organizationId !== undefined) {
    const organization = await identityStore.findOrganizationById(organizationId);
    const membership = await identityStore.findMembership(organizationId, userId);

    if (organization !== undefined && membership !== undefined && membership.status === "active") {
      return organizationId;
    }

    await clearOrganizationSession();
  }

  const organizations = await listOrganizationsForUser(userId, identityStore);
  if (organizations.length === 1) {
    const onlyOrganization = organizations[0];
    if (onlyOrganization !== undefined) {
      await setWorkspaceSession({ userId, organizationId: onlyOrganization.id });
      return onlyOrganization.id;
    }
  }

  return null;
}

export async function resolveWorkspaceContext(): Promise<WorkspaceContext | null> {
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
}
