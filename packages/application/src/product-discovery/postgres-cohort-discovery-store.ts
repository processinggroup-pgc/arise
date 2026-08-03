import type { CohortDiscoveryBundle } from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type { CohortDiscoveryStore } from "./cohort-discovery-store.js";

interface CohortDiscoveryRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  bundle: CohortDiscoveryBundle;
  updated_at: Date;
}

function mapCohortDiscovery(row: CohortDiscoveryRow): CohortDiscoveryBundle {
  const bundle = row.bundle as CohortDiscoveryBundle;
  return {
    ...bundle,
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    updatedAt: new Date(row.updated_at),
    ...(bundle.stressTest !== undefined
      ? { stressTest: { ...bundle.stressTest, generatedAt: new Date(bundle.stressTest.generatedAt) } }
      : {}),
  };
}

export class PostgresCohortDiscoveryStore implements CohortDiscoveryStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveCohortDiscoveryBundle(bundle: CohortDiscoveryBundle): Promise<void> {
    const { id, initiativeId, organizationId, updatedAt, ...rest } = bundle;
    const payload = { id, initiativeId, organizationId, updatedAt, ...rest };

    await this.client.query(
      `
      insert into public.cohort_discovery_bundles (
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

  async findCohortDiscoveryByInitiativeId(
    initiativeId: string,
  ): Promise<CohortDiscoveryBundle | undefined> {
    const result = (await this.client.query(
      `
      select id, initiative_id, organization_id, bundle, updated_at
      from public.cohort_discovery_bundles
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: CohortDiscoveryRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapCohortDiscovery(row);
  }
}
