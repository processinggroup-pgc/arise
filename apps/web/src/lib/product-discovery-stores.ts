import {
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemAlignmentStore,
  InMemoryProblemBriefStore,
  type InitiativeStore,
  type MarketResearchStore,
  type ProblemAlignmentStore,
  type ProblemBriefStore,
} from "@arise/application";

const initiativeStore: InitiativeStore = new InMemoryInitiativeStore();
const problemBriefStore: ProblemBriefStore = new InMemoryProblemBriefStore();
const marketResearchStore: MarketResearchStore = new InMemoryMarketResearchStore();
const problemAlignmentStore: ProblemAlignmentStore = new InMemoryProblemAlignmentStore();

export function getInitiativeStore(): InitiativeStore {
  return initiativeStore;
}

export function getProblemBriefStore(): ProblemBriefStore {
  return problemBriefStore;
}

export function getMarketResearchStore(): MarketResearchStore {
  return marketResearchStore;
}

export function getProblemAlignmentStore(): ProblemAlignmentStore {
  return problemAlignmentStore;
}
