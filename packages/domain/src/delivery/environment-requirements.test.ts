import { describe, expect, it } from "vitest";

import {
  compareEnvironmentRequirements,
  validateEnvironmentRequirementsManifest,
} from "./environment-requirements.js";

describe("environment requirements comparison", () => {
  it("validates manifests without exposing raw secret values", () => {
    const result = validateEnvironmentRequirementsManifest({
      environment: "preview",
      requirements: [
        { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
        { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://preview.example.com" },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("rejects manifests that contain raw secret values", () => {
    const result = validateEnvironmentRequirementsManifest({
      environment: "production",
      requirements: [
        { key: "OPENAI_API_KEY", required: true, valueRef: "sk-123456789012345678901" },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("OPENAI_API_KEY");
  });

  it("reports missing production requirements in preview safely", () => {
    const comparison = compareEnvironmentRequirements(
      {
        environment: "preview",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://preview.example.com" },
        ],
      },
      {
        environment: "production",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://app.example.com" },
          { key: "STRIPE_WEBHOOK_SECRET", required: true, valueRef: "SECRET_REF:stripe-webhook" },
        ],
      },
    );

    expect(comparison.compatible).toBe(false);
    expect(comparison.missingInPreview).toEqual(["STRIPE_WEBHOOK_SECRET"]);
    expect(comparison.comparedKeys).not.toContain("sk-");
  });

  it("passes when preview satisfies production requirements", () => {
    const comparison = compareEnvironmentRequirements(
      {
        environment: "preview",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://preview.example.com" },
          { key: "STRIPE_WEBHOOK_SECRET", required: true, valueRef: "SECRET_REF:stripe-webhook" },
        ],
      },
      {
        environment: "production",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://app.example.com" },
        ],
      },
    );

    expect(comparison.compatible).toBe(true);
  });
});
