import {
  PostgresBuildStore,
  PostgresCohortDiscoveryStore,
  PostgresInitiativeStore,
  PostgresMarketResearchStore,
  PostgresProblemAlignmentStore,
  PostgresProblemBriefStore,
  PostgresTechnicalDesignStore,
  PostgresProjectStore,
  PostgresWorkItemStore,
  withPostgresTenantSession,
  type BuildStore,
  type CohortDiscoveryStore,
  type InitiativeStore,
  type MarketResearchStore,
  type ProblemAlignmentStore,
  type ProblemBriefStore,
  type TechnicalDesignStore,
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
  cohortDiscoveryStore: CohortDiscoveryStore;
  technicalDesignStore: TechnicalDesignStore;
  buildStore: BuildStore;
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
      cohortDiscoveryStore: new PostgresCohortDiscoveryStore(client),
      technicalDesignStore: new PostgresTechnicalDesignStore(client),
      buildStore: new PostgresBuildStore(client),
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
