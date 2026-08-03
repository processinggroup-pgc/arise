import {
  findFramingOption,
  type Initiative,
  type MarketResearchDossier,
  type ProblemAlignment,
  type ProblemBrief,
} from "@arise/domain";

import {
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
} from "./product-discovery-stores";
import { getWorkspaceSession } from "./session";

export interface InitiativeDetail {
  initiative: Initiative;
  problemBrief: ProblemBrief;
  dossier?: MarketResearchDossier;
  alignment?: ProblemAlignment;
  selectedFramingTitle?: string;
}

export async function getInitiativeDetail(initiativeId: string): Promise<InitiativeDetail | null> {
  const session = await getWorkspaceSession();
  if (session.organizationId === undefined) {
    return null;
  }

  const initiative = await getInitiativeStore().findInitiativeById(initiativeId);
  if (initiative === undefined || initiative.organizationId !== session.organizationId) {
    return null;
  }

  const problemBrief = await getProblemBriefStore().findProblemBriefByInitiativeId(initiativeId);
  if (problemBrief === undefined) {
    return null;
  }

  const dossier = await getMarketResearchStore().findMarketResearchByInitiativeId(initiativeId);
  const alignment = await getProblemAlignmentStore().findProblemAlignmentByInitiativeId(initiativeId);
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
}

export async function listInitiativesForWorkspace(): Promise<Initiative[]> {
  const session = await getWorkspaceSession();
  if (session.organizationId === undefined) {
    return [];
  }

  return getInitiativeStore().listInitiativesForOrganization(session.organizationId);
}
