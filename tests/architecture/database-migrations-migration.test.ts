import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260810200000_database_migrations.sql",
);

describe("database migrations migration", () => {
  it("defines tenant-scoped Supabase preview branches and database migrations", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.supabase_preview_branches");
    expect(sql).toContain("create table if not exists public.database_migrations");
    expect(sql).toContain("references public.supabase_preview_branches (id)");
    expect(sql).toContain("database_migrations_tenant_isolation_update");
  });
});
