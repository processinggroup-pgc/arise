import { describe, expect, it } from "vitest";

import { createProblemBrief } from "./problem-brief.js";

describe("createProblemBrief", () => {
  it("captures the initial problem statement and pain points", () => {
    const brief = createProblemBrief(
      {
        initiativeId: "initiative_123",
        organizationId: "org_123",
        rawProblemDescription:
          "People are having trouble finding work and the job market is shrinking, making cohorts harder to afford.",
        targetAudience: "Career changers considering paid cohort programs",
        painPoints: [
          "Fewer entry-level roles reduce confidence in upskilling ROI",
          "Tuition timing conflicts with unemployment or underemployment",
        ],
        businessContext: "Cohort enrollment depends on students believing they can afford tuition and get hired.",
        desiredOutcome: "Increase qualified enrollments without lowering completion quality.",
      },
      {
        id: "problem_brief_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(brief.painPoints).toHaveLength(2);
    expect(brief.targetAudience).toContain("Career changers");
  });
});
