import { normalizeTechnicalDesignBundle, type TechnicalDesignBundle } from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type { TechnicalDesignStore } from "./technical-design-store.js";

interface TechnicalDesignRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  bundle: TechnicalDesignBundle;
  updated_at: Date;
}

function mapTechnicalDesign(row: TechnicalDesignRow): TechnicalDesignBundle {
  const bundle = row.bundle as TechnicalDesignBundle;
  return normalizeTechnicalDesignBundle({
    ...bundle,
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    updatedAt: new Date(row.updated_at),
  });
}

export class PostgresTechnicalDesignStore implements TechnicalDesignStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveTechnicalDesignBundle(bundle: TechnicalDesignBundle): Promise<void> {
    const { id, initiativeId, organizationId, updatedAt, ...rest } = bundle;
    const payload = { id, initiativeId, organizationId, updatedAt, ...rest };

    await this.client.query(
      `
      insert into public.technical_design_bundles (
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

  async findTechnicalDesignByInitiativeId(
    initiativeId: string,
  ): Promise<TechnicalDesignBundle | undefined> {
    const result = (await this.client.query(
      `
      select id, initiative_id, organization_id, bundle, updated_at
      from public.technical_design_bundles
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: TechnicalDesignRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapTechnicalDesign(row);
  }
}
