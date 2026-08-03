import {
  PostgresInitiativeStore,
  PostgresMarketResearchStore,
  PostgresProblemAlignmentStore,
  PostgresProblemBriefStore,
  PostgresProjectStore,
  PostgresWorkItemStore,
  withPostgresTenantSession,
  type InitiativeStore,
  type MarketResearchStore,
  type ProblemAlignmentStore,
  type ProblemBriefStore,
  type ProjectStore,
  type WorkItemStore,
} from "@arise/application";
import { createTenantContext, type TenantContext } from "@arise/domain";

import { getDatabasePool, hasDatabaseUrl } from "./database";

export interface TenantScopedStores {
  projectStore: ProjectStore;
  workItemStore: WorkItemStore;
  initiativeStore: InitiativeStore;
  problemBriefStore: ProblemBriefStore;
  marketResearchStore: MarketResearchStore;
  problemAlignmentStore: ProblemAlignmentStore;
}

export async function runWithTenantScopedStores<T>(
  tenantContext: TenantContext,
  operation: (stores: TenantScopedStores) => Promise<T>,
): Promise<T> {
  if (!hasDatabaseUrl()) {
    throw new Error("Tenant-scoped Postgres stores require DATABASE_URL");
  }

  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    const stores: TenantScopedStores = {
      projectStore: new PostgresProjectStore(client),
      workItemStore: new PostgresWorkItemStore(client),
      initiativeStore: new PostgresInitiativeStore(client),
      problemBriefStore: new PostgresProblemBriefStore(client),
      marketResearchStore: new PostgresMarketResearchStore(client),
      problemAlignmentStore: new PostgresProblemAlignmentStore(client),
    };

    return await withPostgresTenantSession(client, tenantContext, async () => operation(stores));
  } finally {
    client.release();
  }
}

export function createWorkspaceTenantContext(input: {
  organizationId: string;
  userId: string;
}): TenantContext {
  return createTenantContext({
    organizationId: input.organizationId,
    userId: input.userId,
    correlationId: crypto.randomUUID(),
  });
}
