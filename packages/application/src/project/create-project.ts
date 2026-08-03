import { createProject, type Project, type TenantContext } from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "./project-store.js";

export interface CreateProjectCommand {
  tenantContext: TenantContext;
  name: string;
  description?: string;
}

export async function createProjectForOrganization(
  command: CreateProjectCommand,
  store: ProjectStore,
  context: IdentityOperationContext,
): Promise<Project> {
  const project = createProject(
    {
      organizationId: command.tenantContext.organizationId,
      name: command.name,
      ...(command.description !== undefined ? { description: command.description } : {}),
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await store.saveProject(project);
  return project;
}
