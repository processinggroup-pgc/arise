import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260811000000_cost_attributions.sql",
);

describe("cost attributions migration", () => {
  it("defines tenant-scoped cost attribution records with category totals", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.cost_attributions");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("model_cost_usd numeric not null");
    expect(sql).toContain("build_cost_usd numeric not null");
    expect(sql).toContain("sandbox_cost_usd numeric not null");
    expect(sql).toContain("line_items jsonb not null");
    expect(sql).toContain("cost_attributions_tenant_isolation_select");
    expect(sql).toContain("cost_attributions_tenant_isolation_insert");
  });
});
