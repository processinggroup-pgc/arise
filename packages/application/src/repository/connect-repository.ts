import { createRepository, type Repository, type TenantContext } from "@arise/domain";
import type { GitHubRepositoryPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ProjectStore } from "../project/project-store.js";
import type { RepositoryStore } from "./repository-store.js";

export interface ConnectRepositoryCommand {
  tenantContext: TenantContext;
  projectId: string;
  installationId: string;
  owner: string;
  name: string;
}

export class ProjectScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectScopeError";
  }
}

export class RepositoryAlreadyConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryAlreadyConnectedError";
  }
}

export async function connectRepositoryForProject(
  command: ConnectRepositoryCommand,
  projectStore: ProjectStore,
  repositoryStore: RepositoryStore,
  githubPort: GitHubRepositoryPort,
  context: IdentityOperationContext,
): Promise<Repository> {
  const project = await projectStore.findProjectById(command.projectId);
  if (project === undefined) {
    throw new ProjectScopeError("Project was not found");
  }

  if (project.organizationId !== command.tenantContext.organizationId) {
    throw new ProjectScopeError("Project is outside the tenant scope");
  }

  const metadata = await githubPort.getRepository({
    installationId: command.installationId,
    owner: command.owner,
    name: command.name,
  });

  const existing = await repositoryStore.findRepositoryByExternalId(
    command.tenantContext.organizationId,
    "github",
    metadata.externalId,
  );
  if (existing !== undefined) {
    throw new RepositoryAlreadyConnectedError(
      "Repository is already connected for this organization",
    );
  }

  const repository = createRepository(
    {
      organizationId: command.tenantContext.organizationId,
      projectId: command.projectId,
      provider: "github",
      externalId: metadata.externalId,
      fullName: metadata.fullName,
      defaultBranch: metadata.defaultBranch,
      installationId: command.installationId,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await repositoryStore.saveRepository(repository);
  return repository;
}
