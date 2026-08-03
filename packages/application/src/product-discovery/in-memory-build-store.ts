import { createBuildBundle, type BuildBundle } from "@arise/domain";

import type { BuildStore } from "./build-store.js";

export class InMemoryBuildStore implements BuildStore {
  private readonly bundles = new Map<string, BuildBundle>();

  saveBuildBundle(bundle: BuildBundle): Promise<void> {
    this.bundles.set(bundle.initiativeId, bundle);
    return Promise.resolve();
  }

  findBuildBundleByInitiativeId(initiativeId: string): Promise<BuildBundle | undefined> {
    return Promise.resolve(this.bundles.get(initiativeId));
  }
}

export async function getOrCreateBuildBundle(
  store: BuildStore,
  initiativeId: string,
  organizationId: string,
  createId: () => string,
  now: () => Date,
): Promise<BuildBundle> {
  const existing = await store.findBuildBundleByInitiativeId(initiativeId);
  if (existing !== undefined) {
    return existing;
  }

  const bundle = createBuildBundle({
    id: createId(),
    initiativeId,
    organizationId,
    updatedAt: now(),
  });
  await store.saveBuildBundle(bundle);
  return bundle;
}
