import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804100000_requirements_and_acceptance_criteria.sql",
);

describe("requirements and acceptance criteria migration", () => {
  it("defines tenant-scoped requirements with traceable GWT criteria", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.requirements");
    expect(sql).toContain("create table if not exists public.acceptance_criteria");
    expect(sql).toContain("work_item_lineage_id uuid not null");
    expect(sql).toContain("given_text text not null");
    expect(sql).toContain("when_text text not null");
    expect(sql).toContain("then_text text not null");
    expect(sql).toContain("automated_test_ref text not null");
    expect(sql).toContain("unique (organization_id, automated_test_ref)");
    expect(sql).toContain("requirements_tenant_isolation_select");
    expect(sql).toContain("acceptance_criteria_tenant_isolation_insert");
  });
});
