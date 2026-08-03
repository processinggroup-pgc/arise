import { describe, expect, it } from "vitest";

import { compareEnvironmentRequirementsForDelivery } from "./compare-environment-requirements.js";

describe("compareEnvironmentRequirementsForDelivery", () => {
  it("returns safe comparison results without exposing secret values", () => {
    const result = compareEnvironmentRequirementsForDelivery({
      preview: {
        environment: "preview",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://preview.example.com" },
        ],
      },
      production: {
        environment: "production",
        requirements: [
          { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
          { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://app.example.com" },
          { key: "STRIPE_WEBHOOK_SECRET", required: true, valueRef: "SECRET_REF:stripe-webhook" },
        ],
      },
    });

    expect(result.previewValidation.valid).toBe(true);
    expect(result.productionValidation.valid).toBe(true);
    expect(result.comparison.compatible).toBe(false);
    expect(result.comparison.missingInPreview).toEqual(["STRIPE_WEBHOOK_SECRET"]);
    expect(JSON.stringify(result)).not.toContain("sk-");
  });
});
