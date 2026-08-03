import {
  ClaudeMarketResearchGenerator,
  RuleBasedMarketResearchGenerator,
  type MarketResearchGenerator,
} from "@arise/application";

let generator: MarketResearchGenerator | undefined;

export function getMarketResearchGenerator(): MarketResearchGenerator {
  generator ??= createMarketResearchGenerator();
  return generator;
}

function createMarketResearchGenerator(): MarketResearchGenerator {
  const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim();
  if (apiKey !== undefined && apiKey.length > 0) {
    const model = process.env["ANTHROPIC_MODEL"]?.trim();
    return new ClaudeMarketResearchGenerator({
      apiKey,
      ...(model !== undefined && model.length > 0 ? { model } : {}),
    });
  }

  return new RuleBasedMarketResearchGenerator();
}
