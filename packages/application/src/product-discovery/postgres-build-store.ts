import type { BuildBundle } from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type { BuildStore } from "./build-store.js";

interface BuildRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  bundle: BuildBundle;
  updated_at: Date;
}

function mapBuildBundle(row: BuildRow): BuildBundle {
  const bundle = row.bundle as BuildBundle;
  const platformConnections =
    bundle.platformConnections !== undefined
      ? {
          ...bundle.platformConnections,
          stackMode: bundle.platformConnections.stackMode ?? "manual",
          connectedAt: new Date(bundle.platformConnections.connectedAt),
        }
      : undefined;
  return {
    ...bundle,
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    updatedAt: new Date(row.updated_at),
    ...(platformConnections !== undefined ? { platformConnections } : {}),
    ...(bundle.buildPlan !== undefined
      ? {
          buildPlan: {
            ...bundle.buildPlan,
            startedAt: new Date(bundle.buildPlan.startedAt),
            ...(bundle.buildPlan.completedAt !== undefined
              ? { completedAt: new Date(bundle.buildPlan.completedAt) }
              : {}),
          },
        }
      : {}),
    ...(bundle.uatReport !== undefined
      ? {
          uatReport: {
            ...bundle.uatReport,
            testedAt: new Date(bundle.uatReport.testedAt),
          },
        }
      : {}),
  };
}

export class PostgresBuildStore implements BuildStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveBuildBundle(bundle: BuildBundle): Promise<void> {
    const { id, initiativeId, organizationId, updatedAt, ...rest } = bundle;
    const payload = { id, initiativeId, organizationId, updatedAt, ...rest };

    await this.client.query(
      `
      insert into public.build_bundles (
        id, initiative_id, organization_id, bundle, updated_at
      )
      values ($1, $2, $3, $4::jsonb, $5)
      on conflict (initiative_id) do update
      set
        organization_id = excluded.organization_id,
        bundle = excluded.bundle,
        updated_at = excluded.updated_at
      `,
      [id, initiativeId, organizationId, JSON.stringify(payload), updatedAt],
    );
  }

  async findBuildBundleByInitiativeId(initiativeId: string): Promise<BuildBundle | undefined> {
    const result = (await this.client.query(
      `
      select id, initiative_id, organization_id, bundle, updated_at
      from public.build_bundles
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: BuildRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapBuildBundle(row);
  }
}
