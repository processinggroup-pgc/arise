import type { Project, ProjectStatus } from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type { ProjectStore } from "./project-store.js";

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: Date;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class PostgresProjectStore implements ProjectStore {
  constructor(private readonly client: PostgresQueryable) {}

  async findProjectById(projectId: string): Promise<Project | undefined> {
    const result = (await this.client.query(
      `
      select id, organization_id, name, description, status, created_at
      from public.projects
      where id = $1
      `,
      [projectId],
    )) as { rows: ProjectRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapProject(row);
  }

  async saveProject(project: Project): Promise<void> {
    await this.client.query(
      `
      insert into public.projects (id, organization_id, name, description, status, created_at)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (id) do update
      set
        organization_id = excluded.organization_id,
        name = excluded.name,
        description = excluded.description,
        status = excluded.status
      `,
      [
        project.id,
        project.organizationId,
        project.name,
        project.description,
        project.status,
        project.createdAt,
      ],
    );
  }

  async listProjectsForOrganization(organizationId: string): Promise<Project[]> {
    const result = (await this.client.query(
      `
      select id, organization_id, name, description, status, created_at
      from public.projects
      where organization_id = $1
      order by created_at asc
      `,
      [organizationId],
    )) as { rows: ProjectRow[] };

    return result.rows.map(mapProject);
  }
}
