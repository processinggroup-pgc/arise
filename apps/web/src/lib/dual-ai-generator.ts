import {
  OpenAiMarketResearchGenerator,
  ResilientMarketResearchGenerator,
  RuleBasedMarketResearchGenerator,
  type MarketResearchGenerator,
} from "@arise/application";

export function getDualAiSecondaryGenerator(): MarketResearchGenerator {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (apiKey !== undefined && apiKey.length > 0) {
    const model = process.env["OPENAI_MODEL"]?.trim();
    return new ResilientMarketResearchGenerator(
      new OpenAiMarketResearchGenerator({
        apiKey,
        ...(model !== undefined && model.length > 0 ? { model } : {}),
      }),
      new RuleBasedMarketResearchGenerator(),
    );
  }

  return new RuleBasedMarketResearchGenerator();
}

export function isOpenAiConfigured(): boolean {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();
  return apiKey !== undefined && apiKey.length > 0;
}
