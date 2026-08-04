import {
  OpenAiMarketResearchGenerator,
  RuleBasedMarketResearchGenerator,
} from "@arise/application";
import type {
  GenerateMarketResearchInput,
  GenerateMarketResearchMetadata,
  MarketResearchDossier,
} from "@arise/domain";

export type DualAiSecondarySource = "openai" | "rule_based";

export interface DualAiSecondaryResult {
  dossier: MarketResearchDossier;
  source: DualAiSecondarySource;
  warning?: string;
}

export async function generateDualAiSecondary(
  input: GenerateMarketResearchInput,
  metadata: GenerateMarketResearchMetadata,
): Promise<DualAiSecondaryResult> {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();
  const ruleBased = new RuleBasedMarketResearchGenerator();

  if (apiKey === undefined || apiKey.length === 0) {
    return {
      dossier: await ruleBased.generate(input, metadata),
      source: "rule_based",
      warning:
        "OPENAI_API_KEY is not set on the server. ChatGPT comparison uses the rule-based fallback instead.",
    };
  }

  const model = process.env["OPENAI_MODEL"]?.trim();
  const openAi = new OpenAiMarketResearchGenerator({
    apiKey,
    ...(model !== undefined && model.length > 0 ? { model } : {}),
  });

  try {
    return {
      dossier: await openAi.generate(input, metadata),
      source: "openai",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI market research request failed";
    return {
      dossier: await ruleBased.generate(input, metadata),
      source: "rule_based",
      warning: `ChatGPT request failed; showing rule-based fallback. ${message}`,
    };
  }
}

export function isOpenAiConfigured(): boolean {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();
  return apiKey !== undefined && apiKey.length > 0;
}
