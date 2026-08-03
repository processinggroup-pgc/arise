import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260809000000_test_runs.sql",
);

describe("test runs migration", () => {
  it("defines tenant-scoped verification test runs for all categories", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.test_runs");
    expect(sql).toContain("references public.execution_sessions (id)");
    expect(sql).toContain("'acceptance'");
    expect(sql).toContain("counts_json jsonb not null");
    expect(sql).toContain("test_runs_tenant_isolation_select");
    expect(sql).toContain("test_runs_tenant_isolation_insert");
  });
});
