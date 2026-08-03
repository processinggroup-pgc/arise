import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260811100000_budget_pauses.sql",
);

describe("budget pauses migration", () => {
  it("defines tenant-scoped budget pauses and extends budget approval type", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.budget_pauses");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("'budget_approval'");
    expect(sql).toContain("status text not null check (status in ('active', 'released'))");
    expect(sql).toContain("budget_pauses_tenant_isolation_select");
    expect(sql).toContain("budget_pauses_tenant_isolation_update");
  });
});
