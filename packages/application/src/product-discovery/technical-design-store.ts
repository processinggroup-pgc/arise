import type { TechnicalDesignBundle } from "@arise/domain";

export interface TechnicalDesignStore {
  saveTechnicalDesignBundle(bundle: TechnicalDesignBundle): Promise<void>;
  findTechnicalDesignByInitiativeId(initiativeId: string): Promise<TechnicalDesignBundle | undefined>;
}
