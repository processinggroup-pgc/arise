/** Retired 2026-06-15; use claude-sonnet-4-6 (see Anthropic model deprecations). */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

/** Retired Anthropic API model IDs mapped to their recommended replacements. */
export const RETIRED_ANTHROPIC_MODELS: Readonly<Record<string, string>> = {
  "claude-sonnet-4-20250514": "claude-sonnet-4-6",
  "claude-sonnet-4-0": "claude-sonnet-4-6",
  "claude-opus-4-20250514": "claude-opus-4-8",
  "claude-opus-4-0": "claude-opus-4-8",
  "claude-3-7-sonnet-20250219": "claude-sonnet-4-6",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
  "claude-3-haiku-20240307": "claude-haiku-4-5-20251001",
};

export function migrateRetiredAnthropicModel(model: string): string {
  return RETIRED_ANTHROPIC_MODELS[model] ?? model;
}

export function resolveAnthropicModel(model?: string): string {
  const explicit = model?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return migrateRetiredAnthropicModel(explicit);
  }

  const fromEnv = process.env["ANTHROPIC_MODEL"]?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return migrateRetiredAnthropicModel(fromEnv);
  }

  return DEFAULT_ANTHROPIC_MODEL;
}
