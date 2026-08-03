import {
  findFramingOption,
  type Initiative,
  type MarketResearchDossier,
  type ProblemAlignment,
  type ProblemBrief,
} from "@arise/domain";

import { hasDatabaseUrl } from "./database";
import {
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
} from "./product-discovery-stores";
import { createWorkspaceTenantContext, runWithTenantScopedStores } from "./postgres-tenant";
import { runSafely } from "./postgres-support";
import { getWorkspaceSession } from "./session";
import { resolveWorkspaceContext } from "./workspace";

export interface InitiativeDetail {
  initiative: Initiative;
  problemBrief: ProblemBrief;
  dossier?: MarketResearchDossier;
  alignment?: ProblemAlignment;
  selectedFramingTitle?: string;
}

export async function getInitiativeDetail(initiativeId: string): Promise<InitiativeDetail | null> {
  return runSafely(
    async () => {
      const workspace = await resolveWorkspaceContext();
      if (workspace === null) {
        return null;
      }

      const { userId } = await getWorkspaceSession();
      const tenantContext = createWorkspaceTenantContext({
        organizationId: workspace.organizationId,
        userId,
      });

      const initiative = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.initiativeStore.findInitiativeById(initiativeId),
          )
        : await getInitiativeStore().findInitiativeById(initiativeId);

      if (initiative === undefined || initiative.organizationId !== workspace.organizationId) {
        return null;
      }

      const problemBrief = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.problemBriefStore.findProblemBriefByInitiativeId(initiativeId),
          )
        : await getProblemBriefStore().findProblemBriefByInitiativeId(initiativeId);

      if (problemBrief === undefined) {
        return null;
      }

      const dossier = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.marketResearchStore.findMarketResearchByInitiativeId(initiativeId),
          )
        : await getMarketResearchStore().findMarketResearchByInitiativeId(initiativeId);
      const alignment = hasDatabaseUrl()
        ? await runWithTenantScopedStores(tenantContext, async (stores) =>
            stores.problemAlignmentStore.findProblemAlignmentByInitiativeId(initiativeId),
          )
        : await getProblemAlignmentStore().findProblemAlignmentByInitiativeId(initiativeId);
      const selectedFramingTitle =
        dossier !== undefined && alignment !== undefined
          ? findFramingOption(dossier, alignment.selectedFramingId)?.title
          : undefined;

      return {
        initiative,
        problemBrief,
        ...(dossier !== undefined ? { dossier } : {}),
        ...(alignment !== undefined ? { alignment } : {}),
        ...(selectedFramingTitle !== undefined ? { selectedFramingTitle } : {}),
      };
    },
    null,
    "getInitiativeDetail",
  );
}

export async function listInitiativesForWorkspace(): Promise<Initiative[]> {
  return runSafely(
    async () => {
      const workspace = await resolveWorkspaceContext();
      if (workspace === null) {
        return [];
      }

      const { userId } = await getWorkspaceSession();
      const tenantContext = createWorkspaceTenantContext({
        organizationId: workspace.organizationId,
        userId,
      });

      if (hasDatabaseUrl()) {
        return runWithTenantScopedStores(tenantContext, async (stores) =>
          stores.initiativeStore.listInitiativesForOrganization(workspace.organizationId),
        );
      }

      return getInitiativeStore().listInitiativesForOrganization(workspace.organizationId);
    },
    [],
    "listInitiativesForWorkspace",
  );
}
