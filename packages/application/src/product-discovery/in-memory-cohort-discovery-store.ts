import {
  createCohortDiscoveryBundle,
  normalizeCohortDiscoveryBundle,
  type CohortDiscoveryBundle,
} from "@arise/domain";

import type { CohortDiscoveryStore } from "./cohort-discovery-store.js";

export class InMemoryCohortDiscoveryStore implements CohortDiscoveryStore {
  private readonly bundles = new Map<string, CohortDiscoveryBundle>();

  saveCohortDiscoveryBundle(bundle: CohortDiscoveryBundle): Promise<void> {
    this.bundles.set(bundle.initiativeId, bundle);
    return Promise.resolve();
  }

  findCohortDiscoveryByInitiativeId(initiativeId: string): Promise<CohortDiscoveryBundle | undefined> {
    const bundle = this.bundles.get(initiativeId);
    return Promise.resolve(bundle === undefined ? undefined : normalizeCohortDiscoveryBundle(bundle));
  }
}

export async function getOrCreateCohortDiscoveryBundle(
  store: CohortDiscoveryStore,
  initiativeId: string,
  organizationId: string,
  createId: () => string,
  now: () => Date,
): Promise<CohortDiscoveryBundle> {
  const existing = await store.findCohortDiscoveryByInitiativeId(initiativeId);
  if (existing !== undefined) {
    return existing;
  }

  const bundle = createCohortDiscoveryBundle(
    { initiativeId, organizationId },
    { id: createId(), updatedAt: now() },
  );
  await store.saveCohortDiscoveryBundle(bundle);
  return bundle;
}
