export const REPOSITORY_PROVIDERS = ["github"] as const;
export type RepositoryProvider = (typeof REPOSITORY_PROVIDERS)[number];

export const REPOSITORY_STATUSES = ["pending", "connected", "disconnected", "error"] as const;
export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];

export interface Repository {
  id: string;
  organizationId: string;
  projectId: string;
  provider: RepositoryProvider;
  externalId: string;
  fullName: string;
  defaultBranch: string;
  installationId: string;
  status: RepositoryStatus;
  createdAt: Date;
}

export interface CreateRepositoryInput {
  organizationId: string;
  projectId: string;
  provider: string;
  externalId: string;
  fullName: string;
  defaultBranch: string;
  installationId: string;
  status?: string;
}

export interface CreateRepositoryMetadata {
  id: string;
  createdAt: Date;
}

function assertRepositoryProvider(provider: string): RepositoryProvider {
  if (!(REPOSITORY_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error("Repository provider is invalid");
  }

  return provider as RepositoryProvider;
}

function assertRepositoryStatus(status: string): RepositoryStatus {
  if (!(REPOSITORY_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Repository status is invalid");
  }

  return status as RepositoryStatus;
}

export function createRepository(
  input: CreateRepositoryInput,
  metadata: CreateRepositoryMetadata,
): Repository {
  const organizationId = input.organizationId.trim();
  const projectId = input.projectId.trim();
  const externalId = input.externalId.trim();
  const fullName = input.fullName.trim();
  const defaultBranch = input.defaultBranch.trim();
  const installationId = input.installationId.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (projectId.length === 0) {
    throw new Error("Project identifier is required");
  }

  if (externalId.length === 0) {
    throw new Error("Repository external identifier is required");
  }

  if (fullName.length === 0) {
    throw new Error("Repository full name is required");
  }

  if (defaultBranch.length === 0) {
    throw new Error("Repository default branch is required");
  }

  if (installationId.length === 0) {
    throw new Error("Repository installation identifier is required");
  }

  return {
    id: metadata.id,
    organizationId,
    projectId,
    provider: assertRepositoryProvider(input.provider),
    externalId,
    fullName,
    defaultBranch,
    installationId,
    status: assertRepositoryStatus(input.status ?? "connected"),
    createdAt: metadata.createdAt,
  };
}
