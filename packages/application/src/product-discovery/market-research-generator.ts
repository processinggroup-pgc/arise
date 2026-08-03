import type {
  GenerateMarketResearchInput,
  GenerateMarketResearchMetadata,
  MarketResearchDossier,
} from "@arise/domain";

export interface MarketResearchGenerator {
  generate(
    input: GenerateMarketResearchInput,
    metadata: GenerateMarketResearchMetadata,
  ): Promise<MarketResearchDossier>;
}
