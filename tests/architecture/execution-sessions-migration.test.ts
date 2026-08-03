import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260807000000_execution_sessions.sql",
);

describe("execution sessions migration", () => {
  it("defines tenant-scoped ephemeral sandbox sessions", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.execution_sessions");
    expect(sql).toContain("references public.repositories (id)");
    expect(sql).toContain("sandbox_provider text not null check (sandbox_provider in ('fake'))");
    expect(sql).toContain("execution_sessions_tenant_isolation_select");
    expect(sql).toContain("execution_sessions_tenant_isolation_insert");
  });
});
