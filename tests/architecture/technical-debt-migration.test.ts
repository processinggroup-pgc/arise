import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260811300000_technical_debt.sql",
);

describe("technical debt migration", () => {
  it("defines tenant-scoped technical debt with owner and support ownership", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.technical_debt");
    expect(sql).toContain("references public.projects (id)");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("owner_id text not null");
    expect(sql).toContain("support_owner_id text");
    expect(sql).toContain("technical_debt_tenant_isolation_select");
    expect(sql).toContain("technical_debt_tenant_isolation_update");
  });
});
