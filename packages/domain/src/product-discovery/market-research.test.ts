import { describe, expect, it } from "vitest";

import {
  createProblemAlignment,
  findFramingOption,
  generateMarketResearchDossier,
} from "./market-research.js";

const cohortProblemInput = {
  initiativeId: "initiative_123",
  organizationId: "org_123",
  rawProblemDescription:
    "People are having trouble finding work and the job market is steadily decreasing, so people may have difficulty affording my cohorts.",
  targetAudience: "Career changers and underemployed professionals",
  painPoints: [
    "Fewer entry-level roles reduce confidence in upskilling ROI",
    "Upfront cohort tuition is harder to justify during income instability",
  ],
  businessContext: "Enrollment depends on learners believing they can afford tuition and secure employment.",
  desiredOutcome: "Increase qualified cohort enrollments without lowering completion quality.",
};

describe("generateMarketResearchDossier", () => {
  it("generates cohort affordability research with three framing options", () => {
    const dossier = generateMarketResearchDossier(cohortProblemInput, {
      id: "research_123",
      generatedAt: new Date("2026-08-03T12:00:00.000Z"),
      createFramingId: (index) => `framing_${String(index + 1)}`,
    });

    expect(dossier.comparableApproaches.length).toBeGreaterThanOrEqual(3);
    expect(dossier.framingOptions).toHaveLength(3);
    expect(dossier.summary.toLowerCase()).toContain("afford");
  });
});

describe("createProblemAlignment", () => {
  it("records the framing selected by the user", () => {
    const dossier = generateMarketResearchDossier(cohortProblemInput, {
      id: "research_123",
      generatedAt: new Date("2026-08-03T12:00:00.000Z"),
      createFramingId: (index) => `framing_${String(index + 1)}`,
    });
    const selected = dossier.framingOptions[0];
    if (selected === undefined) {
      throw new Error("Expected a framing option");
    }

    const alignment = createProblemAlignment(
      {
        initiativeId: "initiative_123",
        organizationId: "org_123",
        selectedFramingId: selected.id,
        userElaboration: "Prioritize scholarships for unemployed applicants in the first 90 days.",
      },
      {
        id: "alignment_123",
        alignedAt: new Date("2026-08-03T13:00:00.000Z"),
      },
    );

    expect(findFramingOption(dossier, alignment.selectedFramingId)?.title).toBe(selected.title);
  });
});
