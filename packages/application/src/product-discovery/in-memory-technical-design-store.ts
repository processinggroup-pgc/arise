import {
  createTechnicalDesignBundle,
  normalizeTechnicalDesignBundle,
  type TechnicalDesignBundle,
} from "@arise/domain";

import type { TechnicalDesignStore } from "./technical-design-store.js";

export class InMemoryTechnicalDesignStore implements TechnicalDesignStore {
  private readonly bundles = new Map<string, TechnicalDesignBundle>();

  saveTechnicalDesignBundle(bundle: TechnicalDesignBundle): Promise<void> {
    this.bundles.set(bundle.initiativeId, bundle);
    return Promise.resolve();
  }

  findTechnicalDesignByInitiativeId(
    initiativeId: string,
  ): Promise<TechnicalDesignBundle | undefined> {
    const bundle = this.bundles.get(initiativeId);
    return Promise.resolve(bundle === undefined ? undefined : normalizeTechnicalDesignBundle(bundle));
  }
}

export async function getOrCreateTechnicalDesignBundle(
  store: TechnicalDesignStore,
  initiativeId: string,
  organizationId: string,
  createId: () => string,
  now: () => Date,
): Promise<TechnicalDesignBundle> {
  const existing = await store.findTechnicalDesignByInitiativeId(initiativeId);
  if (existing !== undefined) {
    return existing;
  }

  const bundle = createTechnicalDesignBundle(
    { initiativeId, organizationId },
    { id: createId(), updatedAt: now() },
  );
  await store.saveTechnicalDesignBundle(bundle);
  return bundle;
}
