/** Retired 2026-06-15; use claude-sonnet-4-6 (see Anthropic model deprecations). */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function resolveAnthropicModel(model?: string): string {
  const explicit = model?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }

  const fromEnv = process.env["ANTHROPIC_MODEL"]?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }

  return DEFAULT_ANTHROPIC_MODEL;
}
