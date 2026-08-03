import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { InMemoryInitiativeStore, InMemoryProblemBriefStore } from "./in-memory-product-discovery-store.js";
import { createInitiativeWithProblem } from "./create-initiative-with-problem.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_initiative",
});

const operationContext: IdentityOperationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("createInitiativeWithProblem", () => {
  it("creates an initiative and problem brief from intake", async () => {
    const initiativeStore = new InMemoryInitiativeStore();
    const problemBriefStore = new InMemoryProblemBriefStore();

    const result = await createInitiativeWithProblem(
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
        businessContext: "Enrollment depends on learners believing they can afford tuition and secure employment.",
        desiredOutcome: "Increase qualified cohort enrollments without lowering completion quality.",
      },
      initiativeStore,
      problemBriefStore,
      operationContext,
    );

    expect(result.initiative.state).toBe("problem_captured");
    expect(result.problemBrief.initiativeId).toBe(result.initiative.id);
    expect(await problemBriefStore.findProblemBriefByInitiativeId(result.initiative.id)).toEqual(
      result.problemBrief,
    );
  });
});
