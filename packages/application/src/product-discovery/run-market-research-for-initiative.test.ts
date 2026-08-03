import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import {
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemBriefStore,
} from "./in-memory-product-discovery-store.js";
import { createInitiativeWithProblem } from "./create-initiative-with-problem.js";
import { runMarketResearchForInitiative } from "./run-market-research-for-initiative.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_research",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("runMarketResearchForInitiative", () => {
  it("generates research and advances the initiative state", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();
    const marketResearchStore = new InMemoryMarketResearchStore();

    const created = await createInitiativeWithProblem(
      {
        tenantContext,
        title: "Improve cohort affordability during a soft job market",
        rawProblemDescription:
          "People are having trouble finding work and the job market is steadily decreasing, so people may have difficulty affording my cohorts.",
        targetAudience: "Career changers and underemployed professionals",
        painPoints: [
          "Fewer entry-level roles reduce confidence in upskilling ROI",
          "Upfront cohort tuition is harder to justify during income instability",
        ],
        desiredOutcome: "Increase qualified cohort enrollments without lowering completion quality.",
      },
      initiativeStore,
      problemBriefStore,
      operationContext,
    );

    const result = await runMarketResearchForInitiative(
      {
        tenantContext,
        initiativeId: created.initiative.id,
      },
      initiativeStore,
      problemBriefStore,
      marketResearchStore,
      operationContext,
    );

    expect(result.initiative.state).toBe("research_complete");
    expect(result.dossier.framingOptions).toHaveLength(3);
  });
});
