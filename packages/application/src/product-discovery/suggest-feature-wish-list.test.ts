import { describe, expect, it } from "vitest";

import { advanceInitiativeState, createTenantContext, mergeCohortDiscoveryBundle } from "@arise/domain";

import { InMemoryCohortDiscoveryStore } from "./in-memory-cohort-discovery-store.js";
import {
  InMemoryInitiativeStore,
  InMemoryProblemBriefStore,
} from "./in-memory-product-discovery-store.js";
import { createInitiativeWithProblem } from "./create-initiative-with-problem.js";
import {
  generateBusinessCaseForInitiative,
  suggestFeatureWishListForInitiative,
} from "./cohort-discovery-workflow.js";
import { RuleBasedCohortGenerator } from "./rule-based-cohort-generator.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_suggest_features",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const generator = new RuleBasedCohortGenerator();

describe("suggestFeatureWishListForInitiative", () => {
  it("generates five feature suggestions from the business case", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();
    const cohortStore = new InMemoryCohortDiscoveryStore();

    const created = await createInitiativeWithProblem(
      {
        tenantContext,
        title: "Affordable cohort access",
        rawProblemDescription: "Learners struggle to afford cohort tuition during income instability.",
        targetAudience: "Career changers",
        painPoints: ["Upfront tuition is hard to justify"],
        desiredOutcome: "Increase qualified enrollments.",
      },
      initiativeStore,
      problemBriefStore,
      operationContext,
    );

    const aligned = advanceInitiativeState(created.initiative, "problem_aligned", operationContext.now());
    await initiativeStore.saveInitiative(aligned);

    await generateBusinessCaseForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      cohortStore,
      operationContext,
      generator,
    );

    const withBusinessCase = await cohortStore.findCohortDiscoveryByInitiativeId(created.initiative.id);
    expect(withBusinessCase?.featureWishListSuggestions?.length).toBe(5);

    const cleared = mergeCohortDiscoveryBundle(
      withBusinessCase!,
      { featureWishListSuggestions: [] },
      operationContext.now(),
    );
    await cohortStore.saveCohortDiscoveryBundle(cleared);

    const suggested = await suggestFeatureWishListForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      cohortStore,
      operationContext,
      generator,
    );

    expect(suggested.featureWishListSuggestions).toHaveLength(5);
    expect(suggested.featureWishListSuggestions?.[0]).toContain("landing page");
  });

  it("skips regeneration when suggestions already exist", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();
    const cohortStore = new InMemoryCohortDiscoveryStore();

    const created = await createInitiativeWithProblem(
      {
        tenantContext,
        title: "Affordable cohort access",
        rawProblemDescription: "Learners struggle to afford cohort tuition during income instability.",
        targetAudience: "Career changers",
        painPoints: ["Upfront tuition is hard to justify"],
        desiredOutcome: "Increase qualified enrollments.",
      },
      initiativeStore,
      problemBriefStore,
      operationContext,
    );

    const businessCaseComplete = advanceInitiativeState(
      created.initiative,
      "business_case_complete",
      operationContext.now(),
    );
    await initiativeStore.saveInitiative(businessCaseComplete);

    const existingSuggestions = ["Keep A", "Keep B", "Keep C", "Keep D", "Keep E"];
    await cohortStore.saveCohortDiscoveryBundle(
      mergeCohortDiscoveryBundle(
        {
          id: "bundle_1",
          initiativeId: created.initiative.id,
          organizationId: tenantContext.organizationId,
          updatedAt: operationContext.now(),
          businessCase: {
            icp: "Test ICP",
            problem: "Test problem",
            valueProposition: "Test value",
            revenueModelOptions: ["Subscription"],
            acquisitionStrategy: "Content",
            risks: ["Risk"],
          },
          featureWishListSuggestions: existingSuggestions,
        },
        {},
        operationContext.now(),
      ),
    );

    const result = await suggestFeatureWishListForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      cohortStore,
      operationContext,
      generator,
    );

    expect(result.featureWishListSuggestions).toEqual(existingSuggestions);
  });
});
