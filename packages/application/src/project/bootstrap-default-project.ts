import type { Project } from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";

export interface BootstrapDefaultProjectInput {
  organizationId: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: Date;
}

export async function bootstrapDefaultProject(
  client: PostgresQueryable,
  input: BootstrapDefaultProjectInput,
): Promise<Project> {
  await client.query(`select public.arise_create_default_project($1, $2, $3, $4, $5)`, [
    input.organizationId,
    input.projectId,
    input.name,
    input.description,
    input.createdAt,
  ]);

  return {
    id: input.projectId,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    status: "active",
    createdAt: input.createdAt,
  };
}

export interface BootstrapDefaultProjectStore {
  bootstrapDefaultProject(input: BootstrapDefaultProjectInput): Promise<Project>;
}

export function supportsBootstrapDefaultProject(
  store: unknown,
): store is BootstrapDefaultProjectStore {
  return (
    typeof store === "object" &&
    store !== null &&
    "bootstrapDefaultProject" in store &&
    typeof (store as BootstrapDefaultProjectStore).bootstrapDefaultProject === "function"
  );
}
