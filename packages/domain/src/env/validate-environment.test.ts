import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./validate-environment.js";

describe("validateEnvironment", () => {
  it("accepts supported NODE_ENV values", () => {
    const result = validateEnvironment({ NODE_ENV: "development" });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects unsupported NODE_ENV values", () => {
    const result = validateEnvironment({ NODE_ENV: "staging" });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("NODE_ENV must be one of: development, test, production");
  });

  it("rejects raw secret values in environment variables", () => {
    const result = validateEnvironment({
      GITHUB_TOKEN: "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("GITHUB_TOKEN contains a raw secret value");
  });

  it("allows secret references instead of raw values", () => {
    const result = validateEnvironment({
      VERCEL_TEAM_TOKEN: "SECRET_REF:VERCEL_TEAM_TOKEN",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
