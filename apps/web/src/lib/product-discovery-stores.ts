import {
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemAlignmentStore,
  InMemoryProblemBriefStore,
  PostgresInitiativeStore,
  PostgresMarketResearchStore,
  PostgresProblemAlignmentStore,
  PostgresProblemBriefStore,
  type InitiativeStore,
  type MarketResearchStore,
  type ProblemAlignmentStore,
  type ProblemBriefStore,
} from "@arise/application";

import { getDatabasePool, hasDatabaseUrl } from "./database";

let initiativeStore: InitiativeStore | undefined;
let problemBriefStore: ProblemBriefStore | undefined;
let marketResearchStore: MarketResearchStore | undefined;
let problemAlignmentStore: ProblemAlignmentStore | undefined;

export function getInitiativeStore(): InitiativeStore {
  initiativeStore ??= hasDatabaseUrl()
    ? new PostgresInitiativeStore(getDatabasePool())
    : new InMemoryInitiativeStore();

  return initiativeStore;
}

export function getProblemBriefStore(): ProblemBriefStore {
  problemBriefStore ??= hasDatabaseUrl()
    ? new PostgresProblemBriefStore(getDatabasePool())
    : new InMemoryProblemBriefStore();

  return problemBriefStore;
}

export function getMarketResearchStore(): MarketResearchStore {
  marketResearchStore ??= hasDatabaseUrl()
    ? new PostgresMarketResearchStore(getDatabasePool())
    : new InMemoryMarketResearchStore();

  return marketResearchStore;
}

export function getProblemAlignmentStore(): ProblemAlignmentStore {
  problemAlignmentStore ??= hasDatabaseUrl()
    ? new PostgresProblemAlignmentStore(getDatabasePool())
    : new InMemoryProblemAlignmentStore();

  return problemAlignmentStore;
}
