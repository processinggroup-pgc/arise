import { describe, expect, it, vi } from "vitest";

import { PostgresMarketResearchStore } from "./postgres-product-discovery-store.js";

describe("PostgresMarketResearchStore", () => {
  it("serializes jsonb columns as JSON strings", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const store = new PostgresMarketResearchStore({ query });

    const dossier = {
      id: "dossier_123",
      initiativeId: "init_123",
      organizationId: "org_123",
      summary: "Affordability pressure is reshaping cohort demand.",
      marketTrends: ['Hiring slowdown increases "tuition sensitivity"'],
      comparableApproaches: [
        {
          name: 'Merit America "Flex"',
          category: "Deferred tuition",
          approachSummary: "Uses scholarships, staged payments, and ROI guarantees.",
          relevance: "Reduces enrollment friction during income instability.",
        },
      ],
      citations: [
        {
          label: "Labor market softness",
          sourceType: "labor_market_data" as const,
          summary: "Entry-level hiring has slowed across sectors.",
        },
      ],
      framingOptions: [
        {
          id: "framing_1",
          title: "Affordability first",
          description: "Reduce upfront tuition friction.",
          rationale: 'Matches the "affordability" pain point.',
          alignmentScore: 92,
        },
      ],
      generatedAt: new Date("2026-08-03T12:00:00.000Z"),
    };

    await store.saveMarketResearchDossier(dossier);

    expect(query).toHaveBeenCalledOnce();
    const [sql, values] = query.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain("$6::jsonb");
    expect(sql).toContain("$7::jsonb");
    expect(sql).toContain("$8::jsonb");
    expect(values[5]).toBe(JSON.stringify(dossier.comparableApproaches));
    expect(values[6]).toBe(JSON.stringify(dossier.citations));
    expect(values[7]).toBe(JSON.stringify(dossier.framingOptions));
    expect(values[4]).toEqual(dossier.marketTrends);
  });
});
