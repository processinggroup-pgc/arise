import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804000000_projects_and_work_items.sql",
);

describe("projects and work items migration", () => {
  it("defines tenant-scoped projects and versioned work items", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.projects");
    expect(sql).toContain("create table if not exists public.arise_work_items");
    expect(sql).toContain("unique (lineage_id, version)");
    expect(sql).toContain("organization_id uuid not null");
    expect(sql).toContain("acceptance_criteria jsonb not null");
    expect(sql).toContain("projects_tenant_isolation_select");
    expect(sql).toContain("arise_work_items_tenant_isolation_insert");
    expect(sql).toContain("grant select, insert on public.projects to arise_app");
    expect(sql).toContain("grant select, insert on public.arise_work_items to arise_app");
  });
});
