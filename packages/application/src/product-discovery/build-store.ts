import type { BuildBundle } from "@arise/domain";

export interface BuildStore {
  saveBuildBundle(bundle: BuildBundle): Promise<void>;
  findBuildBundleByInitiativeId(initiativeId: string): Promise<BuildBundle | undefined>;
}
