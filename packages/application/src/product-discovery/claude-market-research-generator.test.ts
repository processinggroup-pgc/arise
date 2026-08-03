import { describe, expect, it, vi } from "vitest";

import { ClaudeMarketResearchGenerator } from "./claude-market-research-generator.js";

describe("ClaudeMarketResearchGenerator", () => {
  it("maps Claude JSON into a market research dossier", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "Affordability pressure is reshaping cohort demand.",
              marketTrends: ["Hiring slowdown increases tuition sensitivity"],
              comparableApproaches: [
                {
                  name: "Merit America",
                  category: "Deferred tuition",
                  approachSummary: "Uses scholarships and staged payments.",
                  relevance: "Reduces enrollment friction.",
                },
              ],
              citations: [
                {
                  label: "Labor market softness",
                  sourceType: "labor_market_data",
                  summary: "Entry-level hiring has slowed.",
                },
              ],
              framingOptions: [
                {
                  title: "Affordability first",
                  description: "Reduce upfront tuition friction.",
                  rationale: "Matches the affordability pain point.",
                  alignmentScore: 92,
                },
                {
                  title: "Outcomes first",
                  description: "Lead with placement proof.",
                  rationale: "Builds ROI confidence.",
                  alignmentScore: 86,
                },
                {
                  title: "Market pivot",
                  description: "Target higher-demand roles.",
                  rationale: "Responds to hiring contraction.",
                  alignmentScore: 80,
                },
              ],
            }),
          },
        ],
      }),
    })) as typeof fetch;

    const generator = new ClaudeMarketResearchGenerator({
      apiKey: "test-key",
      fetchImpl,
    });

    const dossier = await generator.generate(
      {
        initiativeId: "init_123",
        organizationId: "org_123",
        rawProblemDescription: "Cohort affordability is declining.",
        targetAudience: "Career changers",
        painPoints: ["Tuition is harder to afford"],
        businessContext: "Enrollment depends on affordability.",
        desiredOutcome: "Increase qualified enrollments.",
      },
      {
        id: "dossier_123",
        generatedAt: new Date("2026-08-03T12:00:00.000Z"),
        createFramingId: (index) => `framing_${String(index + 1)}`,
      },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(dossier.summary).toContain("Affordability pressure");
    expect(dossier.framingOptions).toHaveLength(3);
    expect(dossier.framingOptions[0]?.id).toBe("framing_1");
  });
});
