import { describe, expect, it } from "vitest";

import {
  buildRegisteredModelKey,
  createRegisteredModel,
  resolveRegisteredModel,
} from "./model-registry.js";

describe("model registry", () => {
  it("registers a platform model with provider, name and version", () => {
    const model = createRegisteredModel(
      {
        provider: "openai",
        name: "gpt-4.1",
        version: "2026-08-01",
        capabilities: ["text", "tool_use"],
        status: "active",
        maxTokensPerRun: 128_000,
        maxCostUsdPerRun: 5,
      },
      { id: "model_1" },
    );

    expect(model.organizationId).toBeNull();
    expect(buildRegisteredModelKey(model.provider, model.name, model.version)).toBe(
      "openai:gpt-4.1@2026-08-01",
    );
  });

  it("resolves an organization override before the platform default", () => {
    const platformModel = createRegisteredModel(
      {
        provider: "anthropic",
        name: "claude-sonnet",
        version: "4.0",
        capabilities: ["text"],
        status: "active",
      },
      { id: "model_platform" },
    );
    const orgModel = createRegisteredModel(
      {
        organizationId: "org_123",
        provider: "anthropic",
        name: "claude-sonnet",
        version: "4.0",
        capabilities: ["text", "vision"],
        status: "active",
      },
      { id: "model_org" },
    );

    const resolved = resolveRegisteredModel([platformModel, orgModel], {
      provider: "anthropic",
      name: "claude-sonnet",
      version: "4.0",
      organizationId: "org_123",
    });

    expect(resolved.id).toBe("model_org");
  });

  it("rejects deprecated models", () => {
    const deprecated = createRegisteredModel(
      {
        provider: "cursor",
        name: "composer",
        version: "1.0",
        capabilities: ["text"],
        status: "deprecated",
      },
      { id: "model_deprecated" },
    );

    expect(() =>
      resolveRegisteredModel([deprecated], {
        provider: "cursor",
        name: "composer",
        version: "1.0",
      }),
    ).toThrow("Registered model was not found");
  });
});
