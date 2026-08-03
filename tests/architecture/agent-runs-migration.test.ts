import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260806000000_registered_models_and_agent_runs.sql",
);

describe("agent runs migration", () => {
  it("defines tenant-scoped model registry and agent run records", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.registered_models");
    expect(sql).toContain("create table if not exists public.agent_runs");
    expect(sql).toContain("create table if not exists public.context_items");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("registered_models_tenant_isolation_select");
    expect(sql).toContain("agent_runs_tenant_isolation_insert");
    expect(sql).toContain("context_items_tenant_isolation_insert");
  });
});
