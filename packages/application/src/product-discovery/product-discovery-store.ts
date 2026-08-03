import type {
  Initiative,
  MarketResearchDossier,
  ProblemAlignment,
  ProblemBrief,
} from "@arise/domain";

export interface InitiativeStore {
  saveInitiative(initiative: Initiative): Promise<void>;
  findInitiativeById(initiativeId: string): Promise<Initiative | undefined>;
  listInitiativesForOrganization(organizationId: string): Promise<Initiative[]>;
}

export interface ProblemBriefStore {
  saveProblemBrief(problemBrief: ProblemBrief): Promise<void>;
  findProblemBriefByInitiativeId(initiativeId: string): Promise<ProblemBrief | undefined>;
}

export interface MarketResearchStore {
  saveMarketResearchDossier(dossier: MarketResearchDossier): Promise<void>;
  findMarketResearchByInitiativeId(initiativeId: string): Promise<MarketResearchDossier | undefined>;
}

export interface ProblemAlignmentStore {
  saveProblemAlignment(alignment: ProblemAlignment): Promise<void>;
  findProblemAlignmentByInitiativeId(initiativeId: string): Promise<ProblemAlignment | undefined>;
}
