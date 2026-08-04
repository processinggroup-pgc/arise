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

  it("migrates retired explicit model overrides", () => {
    expect(resolveAnthropicModel("claude-sonnet-4-20250514")).toBe("claude-sonnet-4-6");
  });

  it("migrates retired ANTHROPIC_MODEL env values", () => {
    process.env["ANTHROPIC_MODEL"] = "claude-sonnet-4-20250514";
    expect(resolveAnthropicModel()).toBe("claude-sonnet-4-6");
  });

  it("migrates retired opus models to their replacement", () => {
    expect(resolveAnthropicModel("claude-opus-4-20250514")).toBe("claude-opus-4-8");
  });

  it("leaves active model IDs unchanged", () => {
    expect(resolveAnthropicModel("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
  });
});
