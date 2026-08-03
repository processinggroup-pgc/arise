import {
  generateMarketResearchDossier,
  type GenerateMarketResearchInput,
  type GenerateMarketResearchMetadata,
  type MarketResearchDossier,
} from "@arise/domain";

import type { MarketResearchGenerator } from "./market-research-generator.js";
import { RuleBasedMarketResearchGenerator } from "./rule-based-market-research-generator.js";

export interface ClaudeMarketResearchGeneratorOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface ClaudeResearchPayload {
  summary: string;
  marketTrends: string[];
  comparableApproaches: Array<{
    name: string;
    category: string;
    approachSummary: string;
    relevance: string;
  }>;
  citations: Array<{
    label: string;
    sourceType: "industry_report" | "company_case_study" | "labor_market_data" | "internal_note";
    summary: string;
  }>;
  framingOptions: Array<{
    title: string;
    description: string;
    rationale: string;
    alignmentScore: number;
  }>;
}

function extractJsonObject(text: string): string {
  const fencedMatch = /```json\s*([\s\S]*?)```/u.exec(text);
  if (fencedMatch?.[1] !== undefined) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude response did not include JSON research output");
  }

  return text.slice(start, end + 1);
}

function assertResearchPayload(value: unknown): ClaudeResearchPayload {
  if (typeof value !== "object" || value === null) {
    throw new Error("Claude research payload was not an object");
  }

  const payload = value as Record<string, unknown>;
  const requiredArrays = [
    "marketTrends",
    "comparableApproaches",
    "citations",
    "framingOptions",
  ] as const;

  if (typeof payload["summary"] !== "string" || payload["summary"].trim().length === 0) {
    throw new Error("Claude research payload missing summary");
  }

  for (const key of requiredArrays) {
    if (!Array.isArray(payload[key])) {
      throw new Error(`Claude research payload missing ${key}`);
    }
  }

  return payload as unknown as ClaudeResearchPayload;
}

export class ClaudeMarketResearchGenerator implements MarketResearchGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClaudeMarketResearchGeneratorOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "claude-sonnet-4-20250514";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(
    input: GenerateMarketResearchInput,
    metadata: GenerateMarketResearchMetadata,
  ): Promise<MarketResearchDossier> {
    const response = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.2,
        system:
          "You are a product strategy researcher for ARISE Studio. Return only valid JSON matching the requested schema. Ground recommendations in the problem brief and propose exactly three distinct framing options with alignmentScore integers from 0 to 100.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Research this business problem and return JSON with keys:",
                  "summary, marketTrends, comparableApproaches, citations, framingOptions.",
                  "",
                  "Problem description:",
                  input.rawProblemDescription,
                  "",
                  "Target audience:",
                  input.targetAudience,
                  "",
                  "Pain points:",
                  input.painPoints.join("; "),
                  "",
                  "Business context:",
                  input.businessContext,
                  "",
                  "Desired outcome:",
                  input.desiredOutcome,
                  "",
                  "Schema example:",
                  JSON.stringify(
                    {
                      summary: "string",
                      marketTrends: ["string"],
                      comparableApproaches: [
                        {
                          name: "string",
                          category: "string",
                          approachSummary: "string",
                          relevance: "string",
                        },
                      ],
                      citations: [
                        {
                          label: "string",
                          sourceType: "industry_report",
                          summary: "string",
                        },
                      ],
                      framingOptions: [
                        {
                          title: "string",
                          description: "string",
                          rationale: "string",
                          alignmentScore: 90,
                        },
                      ],
                    },
                    null,
                    2,
                  ),
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude market research failed (${String(response.status)}): ${errorBody}`);
    }

    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = body.content?.find((block) => block.type === "text")?.text;
    if (text === undefined || text.trim().length === 0) {
      throw new Error("Claude market research returned an empty response");
    }

    const payload = assertResearchPayload(JSON.parse(extractJsonObject(text)) as unknown);

    return {
      id: metadata.id,
      initiativeId: input.initiativeId,
      organizationId: input.organizationId,
      summary: payload.summary.trim(),
      marketTrends: payload.marketTrends.map((trend) => String(trend).trim()).filter(Boolean),
      comparableApproaches: payload.comparableApproaches.map((approach) => ({
        name: String(approach.name).trim(),
        category: String(approach.category).trim(),
        approachSummary: String(approach.approachSummary).trim(),
        relevance: String(approach.relevance).trim(),
      })),
      citations: payload.citations.map((citation) => ({
        label: String(citation.label).trim(),
        sourceType: citation.sourceType,
        summary: String(citation.summary).trim(),
      })),
      framingOptions: payload.framingOptions.slice(0, 3).map((option, index) => ({
        id: metadata.createFramingId(index),
        title: String(option.title).trim(),
        description: String(option.description).trim(),
        rationale: String(option.rationale).trim(),
        alignmentScore: Number(option.alignmentScore),
      })),
      generatedAt: metadata.generatedAt,
    };
  }
}

export class ResilientMarketResearchGenerator implements MarketResearchGenerator {
  constructor(
    private readonly primary: MarketResearchGenerator,
    private readonly fallback: MarketResearchGenerator,
  ) {}

  async generate(
    input: GenerateMarketResearchInput,
    metadata: GenerateMarketResearchMetadata,
  ): Promise<MarketResearchDossier> {
    try {
      return await this.primary.generate(input, metadata);
    } catch {
      return this.fallback.generate(input, metadata);
    }
  }
}

export function createClaudeMarketResearchGenerator(
  options: ClaudeMarketResearchGeneratorOptions,
): MarketResearchGenerator {
  return new ResilientMarketResearchGenerator(
    new ClaudeMarketResearchGenerator(options),
    new RuleBasedMarketResearchGenerator(),
  );
}
