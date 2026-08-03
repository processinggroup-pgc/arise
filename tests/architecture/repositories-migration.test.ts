import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260805000000_repositories.sql",
);

describe("repositories migration", () => {
  it("defines tenant-scoped GitHub repository connections", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.repositories");
    expect(sql).toContain("provider text not null check (provider in ('github'))");
    expect(sql).toContain("installation_id text not null");
    expect(sql).toContain("unique (organization_id, provider, external_id)");
    expect(sql).toContain("repositories_tenant_isolation_select");
    expect(sql).toContain("repositories_tenant_isolation_insert");
  });
});
