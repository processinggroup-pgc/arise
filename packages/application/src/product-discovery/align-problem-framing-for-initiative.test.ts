import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import {
  InMemoryInitiativeStore,
  InMemoryMarketResearchStore,
  InMemoryProblemAlignmentStore,
  InMemoryProblemBriefStore,
} from "./in-memory-product-discovery-store.js";
import { alignProblemFramingForInitiative } from "./align-problem-framing-for-initiative.js";
import { createInitiativeWithProblem } from "./create-initiative-with-problem.js";
import { runMarketResearchForInitiative } from "./run-market-research-for-initiative.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_alignment",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("alignProblemFramingForInitiative", () => {
  it("records the selected framing and advances the initiative", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();
    const marketResearchStore = new InMemoryMarketResearchStore();
    const problemAlignmentStore = new InMemoryProblemAlignmentStore();

    const created = await createInitiativeWithProblem(
      {
        tenantContext,
        title: "Improve cohort affordability during a soft job market",
        rawProblemDescription:
          "People are having trouble finding work and the job market is steadily decreasing, so people may have difficulty affording my cohorts.",
        targetAudience: "Career changers and underemployed professionals",
        painPoints: ["Upfront cohort tuition is harder to justify during income instability"],
        desiredOutcome: "Increase qualified cohort enrollments without lowering completion quality.",
      },
      initiativeStore,
      problemBriefStore,
      operationContext,
    );

    const researched = await runMarketResearchForInitiative(
      {
        tenantContext,
        initiativeId: created.initiative.id,
      },
      initiativeStore,
      problemBriefStore,
      marketResearchStore,
      operationContext,
    );

    const selectedFraming = researched.dossier.framingOptions[0];
    if (selectedFraming === undefined) {
      throw new Error("Expected a framing option");
    }

    const result = await alignProblemFramingForInitiative(
      {
        tenantContext,
        initiativeId: created.initiative.id,
        selectedFramingId: selectedFraming.id,
        userElaboration: "Start with unemployed learner scholarships.",
      },
      initiativeStore,
      marketResearchStore,
      problemAlignmentStore,
      operationContext,
    );

    expect(result.initiative.state).toBe("problem_aligned");
    expect(result.alignment.selectedFramingId).toBe(selectedFraming.id);
  });
});
