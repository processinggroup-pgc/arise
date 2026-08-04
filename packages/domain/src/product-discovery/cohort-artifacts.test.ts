import { describe, expect, it } from "vitest";

import {
  createCohortDiscoveryBundle,
  normalizeCohortDiscoveryBundle,
} from "./cohort-artifacts.js";

describe("normalizeCohortDiscoveryBundle", () => {
  it("defaults missing suggestion arrays on legacy jsonb bundles", () => {
    const legacy = createCohortDiscoveryBundle(
      { initiativeId: "init-1", organizationId: "org-1" },
      { id: "bundle-1", updatedAt: new Date("2026-01-01T00:00:00.000Z") },
    );

    const normalized = normalizeCohortDiscoveryBundle({
      ...legacy,
      businessConceptSuggestions: {
        problem: "Painful onboarding",
        customer: "SMB founders",
        solution: "Guided setup wizard",
        whyNow: "AI lowers build cost",
        topRisks: undefined as unknown as string[],
      },
      businessCase: {
        icp: "Founders",
        problem: "Slow launch",
        valueProposition: "Ship faster",
        revenueModelOptions: undefined as unknown as string[],
        acquisitionStrategy: "Content",
        risks: undefined as unknown as string[],
      },
      featureWishListSuggestions: undefined,
      revenueHypothesisSuggestions: {
        chosenModel: "Subscription",
        pricingStartingPoint: "$29/mo",
        killerAssumption: "Founders pay before revenue",
      },
      businessConcept: {
        problem: "Legacy problem",
        customer: "Legacy customer",
        solution: "Legacy solution",
        whyNow: "Legacy timing",
        topRisks: undefined as unknown as string[],
      },
      stressTest: {
        failureModes: undefined as unknown as string[],
        nonUsers: undefined as unknown as string[],
        wrongAssumptions: undefined as unknown as string[],
        generatedAt: "2026-01-02T00:00:00.000Z",
      },
    });

    expect(normalized.businessConceptSuggestions?.topRisks).toEqual([]);
    expect(normalized.businessConcept?.topRisks).toEqual([]);
    expect(normalized.businessCase?.revenueModelOptions).toEqual([]);
    expect(normalized.businessCase?.risks).toEqual([]);
    expect(normalized.featureWishListSuggestions).toBeUndefined();
    expect(normalized.stressTest?.failureModes).toEqual([]);
    expect(normalized.stressTest?.generatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });
});
