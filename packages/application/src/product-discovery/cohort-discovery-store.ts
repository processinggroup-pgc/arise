import type { CohortDiscoveryBundle } from "@arise/domain";

export interface CohortDiscoveryStore {
  saveCohortDiscoveryBundle(bundle: CohortDiscoveryBundle): Promise<void>;
  findCohortDiscoveryByInitiativeId(initiativeId: string): Promise<CohortDiscoveryBundle | undefined>;
}
