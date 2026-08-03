import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260811400000_work_item_outcomes.sql",
);

describe("work item outcomes migration", () => {
  it("defines tenant-scoped outcome records with cost and recommendation payloads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.work_item_outcomes");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("total_cost_usd numeric not null");
    expect(sql).toContain("incident_count integer not null");
    expect(sql).toContain("open_technical_debt_count integer not null");
    expect(sql).toContain("recommendations jsonb not null");
    expect(sql).toContain("work_item_outcomes_tenant_isolation_select");
  });
});
