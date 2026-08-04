import { describe, expect, it } from "vitest";

import {
  advanceInitiativeState,
  createTenantContext,
  mergeCohortDiscoveryBundle,
} from "@arise/domain";

import { InMemoryCohortDiscoveryStore } from "./in-memory-cohort-discovery-store.js";
import {
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemBriefStore,
} from "./in-memory-product-discovery-store.js";
import { createInitiativeWithProblem } from "./create-initiative-with-problem.js";
import {
  suggestBusinessConceptForInitiative,
  suggestRevenueHypothesisForInitiative,
} from "./cohort-discovery-workflow.js";
import { RuleBasedCohortGenerator } from "./rule-based-cohort-generator.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_suggest_fields",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const generator = new RuleBasedCohortGenerator();

describe("suggestBusinessConceptForInitiative", () => {
  it("generates editable business concept suggestions from research", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();
    const marketResearchStore = new InMemoryMarketResearchStore();
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

    const researchComplete = advanceInitiativeState(
      created.initiative,
      "research_complete",
      operationContext.now(),
    );
    await initiativeStore.saveInitiative(researchComplete);

    await marketResearchStore.saveMarketResearchDossier({
      id: "dossier_1",
      initiativeId: created.initiative.id,
      organizationId: tenantContext.organizationId,
      summary: "Soft job market increases price sensitivity for upskilling.",
      marketTrends: ["Income instability", "Demand for flexible payment"],
      comparableApproaches: [{ name: "ISA bootcamps", approachSummary: "Deferred tuition" }],
      framingOptions: [
        {
          id: "frame_1",
          title: "Flexible payment cohort",
          description: "Reduce upfront tuition friction",
          alignmentScore: 0.9,
        },
      ],
      generatedAt: operationContext.now(),
    });

    const suggested = await suggestBusinessConceptForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      marketResearchStore,
      cohortStore,
      operationContext,
      generator,
    );

    expect(suggested.businessConceptSuggestions?.problem).toContain("cohort tuition");
    expect(suggested.businessConceptSuggestions?.topRisks.length).toBeGreaterThanOrEqual(1);
  });
});

describe("suggestRevenueHypothesisForInitiative", () => {
  it("generates revenue hypothesis suggestions when missing", async () => {
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

    const solutionSelected = advanceInitiativeState(
      created.initiative,
      "solution_selected",
      operationContext.now(),
    );
    await initiativeStore.saveInitiative(solutionSelected);

    await cohortStore.saveCohortDiscoveryBundle(
      mergeCohortDiscoveryBundle(
        {
          id: "bundle_1",
          initiativeId: created.initiative.id,
          organizationId: tenantContext.organizationId,
          updatedAt: operationContext.now(),
          businessCase: {
            icp: "Career changers",
            problem: "Affordability",
            valueProposition: "Flexible payment",
            revenueModelOptions: ["Tiered tuition"],
            acquisitionStrategy: "Content",
            risks: ["Price sensitivity"],
          },
          mvpScope: {
            featureWishList: ["Landing page", "Payment plans", "Application form"],
            coreFeatures: ["Landing page", "Payment plans"],
            notToBuild: ["Application form"],
            userFlowSummary: "Discover and enroll",
            fastestPathToValue: "Show payment options quickly",
          },
        },
        {},
        operationContext.now(),
      ),
    );

    const suggested = await suggestRevenueHypothesisForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      cohortStore,
      operationContext,
      generator,
    );

    expect(suggested.revenueHypothesisSuggestions?.chosenModel.length).toBeGreaterThan(0);
    expect(suggested.revenueHypothesisSuggestions?.pricingStartingPoint.length).toBeGreaterThan(0);
    expect(suggested.revenueHypothesisSuggestions?.killerAssumption.length).toBeGreaterThan(0);
  });

  it("skips regeneration when revenue suggestions already exist", async () => {
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

    const solutionSelected = advanceInitiativeState(
      created.initiative,
      "solution_selected",
      operationContext.now(),
    );
    await initiativeStore.saveInitiative(solutionSelected);

    const existing = {
      chosenModel: "Keep model",
      pricingStartingPoint: "Keep pricing",
      killerAssumption: "Keep assumption",
    };
    await cohortStore.saveCohortDiscoveryBundle(
      mergeCohortDiscoveryBundle(
        {
          id: "bundle_1",
          initiativeId: created.initiative.id,
          organizationId: tenantContext.organizationId,
          updatedAt: operationContext.now(),
          businessCase: {
            icp: "Career changers",
            problem: "Affordability",
            valueProposition: "Flexible payment",
            revenueModelOptions: ["Tiered tuition"],
            acquisitionStrategy: "Content",
            risks: ["Price sensitivity"],
          },
          mvpScope: {
            featureWishList: ["A", "B", "C"],
            coreFeatures: ["A", "B"],
            notToBuild: ["C"],
            userFlowSummary: "Discover and enroll",
            fastestPathToValue: "Show payment options quickly",
          },
          revenueHypothesisSuggestions: existing,
        },
        {},
        operationContext.now(),
      ),
    );

    const result = await suggestRevenueHypothesisForInitiative(
      { tenantContext, initiativeId: created.initiative.id },
      initiativeStore,
      problemBriefStore,
      cohortStore,
      operationContext,
      generator,
    );

    expect(result.revenueHypothesisSuggestions).toEqual(existing);
  });
});
