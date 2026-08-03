import type {
  GenerateMarketResearchInput,
  GenerateMarketResearchMetadata,
  MarketResearchDossier,
} from "@arise/domain";

import type { MarketResearchGenerator } from "./market-research-generator.js";

export interface OpenAiMarketResearchGeneratorOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface OpenAiResearchPayload {
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
    throw new Error("OpenAI response did not include JSON research output");
  }

  return text.slice(start, end + 1);
}

function assertResearchPayload(value: unknown): OpenAiResearchPayload {
  if (typeof value !== "object" || value === null) {
    throw new Error("OpenAI research payload was not an object");
  }

  const payload = value as Record<string, unknown>;
  const requiredArrays = [
    "marketTrends",
    "comparableApproaches",
    "citations",
    "framingOptions",
  ] as const;

  if (typeof payload["summary"] !== "string" || payload["summary"].trim().length === 0) {
    throw new Error("OpenAI research payload missing summary");
  }

  for (const key of requiredArrays) {
    if (!Array.isArray(payload[key])) {
      throw new Error(`OpenAI research payload missing ${key}`);
    }
  }

  return payload as unknown as OpenAiResearchPayload;
}

function buildResearchPrompt(input: GenerateMarketResearchInput): string {
  return [
    "Research this business problem and return JSON with keys:",
    "summary, marketTrends, comparableApproaches, citations, framingOptions.",
    "Propose exactly three distinct framing options with alignmentScore integers from 0 to 100.",
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
  ].join("\n");
}

export class OpenAiMarketResearchGenerator implements MarketResearchGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiMarketResearchGeneratorOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-4o";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(
    input: GenerateMarketResearchInput,
    metadata: GenerateMarketResearchMetadata,
  ): Promise<MarketResearchDossier> {
    const response = await this.fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a product strategy researcher for ARISE Studio cohort Week 1. Return only valid JSON matching the requested schema.",
          },
          { role: "user", content: buildResearchPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI market research failed (${String(response.status)}): ${errorBody}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content;
    if (text === undefined || text.trim().length === 0) {
      throw new Error("OpenAI market research returned an empty response");
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
