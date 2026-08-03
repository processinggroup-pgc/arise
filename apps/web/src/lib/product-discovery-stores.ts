import {
  InMemoryBuildStore,
  InMemoryCohortDiscoveryStore,
  InMemoryTechnicalDesignStore,
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemAlignmentStore,
  InMemoryProblemBriefStore,
  PostgresBuildStore,
  PostgresCohortDiscoveryStore,
  PostgresTechnicalDesignStore,
  PostgresInitiativeStore,
  PostgresMarketResearchStore,
  PostgresProblemAlignmentStore,
  PostgresProblemBriefStore,
  type BuildStore,
  type CohortDiscoveryStore,
  type InitiativeStore,
  type MarketResearchStore,
  type ProblemAlignmentStore,
  type ProblemBriefStore,
  type TechnicalDesignStore,
} from "@arise/application";

import { getDatabasePool, hasDatabaseUrl } from "./database";

let initiativeStore: InitiativeStore | undefined;
let problemBriefStore: ProblemBriefStore | undefined;
let marketResearchStore: MarketResearchStore | undefined;
let problemAlignmentStore: ProblemAlignmentStore | undefined;
let cohortDiscoveryStore: CohortDiscoveryStore | undefined;
let technicalDesignStore: TechnicalDesignStore | undefined;
let buildStore: BuildStore | undefined;

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

export function getCohortDiscoveryStore(): CohortDiscoveryStore {
  cohortDiscoveryStore ??= hasDatabaseUrl()
    ? new PostgresCohortDiscoveryStore(getDatabasePool())
    : new InMemoryCohortDiscoveryStore();

  return cohortDiscoveryStore;
}

export function getTechnicalDesignStore(): TechnicalDesignStore {
  technicalDesignStore ??= hasDatabaseUrl()
    ? new PostgresTechnicalDesignStore(getDatabasePool())
    : new InMemoryTechnicalDesignStore();

  return technicalDesignStore;
}

export function getBuildStore(): BuildStore {
  buildStore ??= hasDatabaseUrl()
    ? new PostgresBuildStore(getDatabasePool())
    : new InMemoryBuildStore();

  return buildStore;
}
