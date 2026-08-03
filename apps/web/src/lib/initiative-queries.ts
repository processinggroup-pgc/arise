import {
  findFramingOption,
  type CohortDiscoveryBundle,
  type Initiative,
  type MarketResearchDossier,
  type ProblemAlignment,
  type ProblemBrief,
  type TechnicalDesignBundle,
} from "@arise/domain";

import { hasDatabaseUrl } from "./database";
import {
  getCohortDiscoveryStore,
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
  getTechnicalDesignStore,
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
  bundle?: CohortDiscoveryBundle;
  technicalBundle?: TechnicalDesignBundle;
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

      const load = async (stores: {
        initiativeStore: ReturnType<typeof getInitiativeStore>;
        problemBriefStore: ReturnType<typeof getProblemBriefStore>;
        marketResearchStore: ReturnType<typeof getMarketResearchStore>;
        problemAlignmentStore: ReturnType<typeof getProblemAlignmentStore>;
        cohortDiscoveryStore: ReturnType<typeof getCohortDiscoveryStore>;
        technicalDesignStore: ReturnType<typeof getTechnicalDesignStore>;
      }) => {
        const initiative = await stores.initiativeStore.findInitiativeById(initiativeId);
        if (initiative === undefined || initiative.organizationId !== workspace.organizationId) {
          return null;
        }

        const problemBrief = await stores.problemBriefStore.findProblemBriefByInitiativeId(initiativeId);
        if (problemBrief === undefined) {
          return null;
        }

        const dossier = await stores.marketResearchStore.findMarketResearchByInitiativeId(initiativeId);
        const alignment = await stores.problemAlignmentStore.findProblemAlignmentByInitiativeId(initiativeId);
        const bundle = await stores.cohortDiscoveryStore.findCohortDiscoveryByInitiativeId(initiativeId);
        const technicalBundle =
          await stores.technicalDesignStore.findTechnicalDesignByInitiativeId(initiativeId);
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
          ...(bundle !== undefined ? { bundle } : {}),
          ...(technicalBundle !== undefined ? { technicalBundle } : {}),
        };
      };

      if (hasDatabaseUrl()) {
        return runWithTenantScopedStores(tenantContext, load);
      }

      return load({
        initiativeStore: getInitiativeStore(),
        problemBriefStore: getProblemBriefStore(),
        marketResearchStore: getMarketResearchStore(),
        problemAlignmentStore: getProblemAlignmentStore(),
        cohortDiscoveryStore: getCohortDiscoveryStore(),
        technicalDesignStore: getTechnicalDesignStore(),
      });
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
