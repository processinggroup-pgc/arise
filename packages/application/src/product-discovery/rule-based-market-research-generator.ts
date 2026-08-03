import { generateMarketResearchDossier } from "@arise/domain";

import type { MarketResearchGenerator } from "./market-research-generator.js";

export class RuleBasedMarketResearchGenerator implements MarketResearchGenerator {
  generate(
    input: Parameters<typeof generateMarketResearchDossier>[0],
    metadata: Parameters<typeof generateMarketResearchDossier>[1],
  ) {
    return Promise.resolve(generateMarketResearchDossier(input, metadata));
  }
}
