import { resolveAnthropicModel } from "../anthropic-model.js";

export interface ClaudeJsonGeneratorOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export interface ClaudeJsonGenerateInput {
  system: string;
  prompt: string;
}

function extractJsonObject(text: string): string {
  const fencedMatch = /```json\s*([\s\S]*?)```/u.exec(text);
  if (fencedMatch?.[1] !== undefined) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude response did not include JSON output");
  }

  return text.slice(start, end + 1);
}

export class ClaudeJsonGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClaudeJsonGeneratorOptions) {
    this.apiKey = options.apiKey;
    this.model = resolveAnthropicModel(options.model);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate<T>(input: ClaudeJsonGenerateInput): Promise<T> {
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
        system: input.system,
        messages: [{ role: "user", content: [{ type: "text", text: input.prompt }] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Claude API request failed (${String(response.status)}): ${body}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((block) => block.type === "text")?.text;
    if (text === undefined || text.trim().length === 0) {
      throw new Error("Claude response did not include text content");
    }

    return JSON.parse(extractJsonObject(text)) as T;
  }
}

export function createClaudeJsonGenerator(apiKey: string): ClaudeJsonGenerator {
  return new ClaudeJsonGenerator({ apiKey });
}
