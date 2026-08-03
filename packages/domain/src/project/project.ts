export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: Date;
}

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  description?: string;
  status?: string;
}

export interface CreateProjectMetadata {
  id: string;
  createdAt: Date;
}

function assertProjectStatus(status: string): ProjectStatus {
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Project status is invalid");
  }

  return status as ProjectStatus;
}

export function createProject(input: CreateProjectInput, metadata: CreateProjectMetadata): Project {
  const organizationId = input.organizationId.trim();
  const name = input.name.trim();
  const description = input.description?.trim() ?? "";

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (name.length === 0) {
    throw new Error("Project name is required");
  }

  return {
    id: metadata.id,
    organizationId,
    name,
    description,
    status: assertProjectStatus(input.status ?? "active"),
    createdAt: metadata.createdAt,
  };
}
