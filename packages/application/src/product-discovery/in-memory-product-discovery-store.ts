import {
  normalizeMarketResearchDossier,
  type Initiative,
  type MarketResearchDossier,
  type ProblemAlignment,
  type ProblemBrief,
} from "@arise/domain";

import type {
  InitiativeStore,
  MarketResearchStore,
  ProblemAlignmentStore,
  ProblemBriefStore,
} from "./product-discovery-store.js";

export class InMemoryInitiativeStore implements InitiativeStore {
  private readonly initiatives = new Map<string, Initiative>();

  saveInitiative(initiative: Initiative): Promise<void> {
    this.initiatives.set(initiative.id, initiative);
    return Promise.resolve();
  }

  findInitiativeById(initiativeId: string): Promise<Initiative | undefined> {
    return Promise.resolve(this.initiatives.get(initiativeId));
  }

  listInitiativesForOrganization(organizationId: string): Promise<Initiative[]> {
    return Promise.resolve(
      [...this.initiatives.values()]
        .filter((initiative) => initiative.organizationId === organizationId)
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()),
    );
  }
}

export class InMemoryProblemBriefStore implements ProblemBriefStore {
  private readonly briefs = new Map<string, ProblemBrief>();

  saveProblemBrief(problemBrief: ProblemBrief): Promise<void> {
    this.briefs.set(problemBrief.initiativeId, problemBrief);
    return Promise.resolve();
  }

  findProblemBriefByInitiativeId(initiativeId: string): Promise<ProblemBrief | undefined> {
    return Promise.resolve(this.briefs.get(initiativeId));
  }
}

export class InMemoryMarketResearchStore implements MarketResearchStore {
  private readonly dossiers = new Map<string, MarketResearchDossier>();

  saveMarketResearchDossier(dossier: MarketResearchDossier): Promise<void> {
    this.dossiers.set(dossier.initiativeId, dossier);
    return Promise.resolve();
  }

  findMarketResearchByInitiativeId(initiativeId: string): Promise<MarketResearchDossier | undefined> {
    const dossier = this.dossiers.get(initiativeId);
    return Promise.resolve(dossier === undefined ? undefined : normalizeMarketResearchDossier(dossier));
  }
}

export class InMemoryProblemAlignmentStore implements ProblemAlignmentStore {
  private readonly alignments = new Map<string, ProblemAlignment>();

  saveProblemAlignment(alignment: ProblemAlignment): Promise<void> {
    this.alignments.set(alignment.initiativeId, alignment);
    return Promise.resolve();
  }

  findProblemAlignmentByInitiativeId(initiativeId: string): Promise<ProblemAlignment | undefined> {
    return Promise.resolve(this.alignments.get(initiativeId));
  }
}
