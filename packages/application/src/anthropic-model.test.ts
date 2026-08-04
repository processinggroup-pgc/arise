import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_ANTHROPIC_MODEL, resolveAnthropicModel } from "./anthropic-model.js";

describe("resolveAnthropicModel", () => {
  const originalModel = process.env["ANTHROPIC_MODEL"];

  afterEach(() => {
    if (originalModel === undefined) {
      delete process.env["ANTHROPIC_MODEL"];
    } else {
      process.env["ANTHROPIC_MODEL"] = originalModel;
    }
  });

  it("prefers an explicit model override", () => {
    process.env["ANTHROPIC_MODEL"] = "claude-from-env";
    expect(resolveAnthropicModel(" claude-explicit ")).toBe("claude-explicit");
  });

  it("falls back to ANTHROPIC_MODEL when no override is provided", () => {
    process.env["ANTHROPIC_MODEL"] = " claude-from-env ";
    expect(resolveAnthropicModel()).toBe("claude-from-env");
  });

  it("uses the default model when env and override are absent", () => {
    delete process.env["ANTHROPIC_MODEL"];
    expect(resolveAnthropicModel()).toBe(DEFAULT_ANTHROPIC_MODEL);
  });
});
