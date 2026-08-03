import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260806200000_agent_run_checkpoints.sql",
);

describe("agent run checkpoints migration", () => {
  it("defines tenant-scoped durable checkpoint records", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.agent_run_checkpoints");
    expect(sql).toContain("references public.agent_runs (id)");
    expect(sql).toContain("agent_run_checkpoints_tenant_isolation_select");
    expect(sql).toContain("agent_run_checkpoints_tenant_isolation_insert");
  });
});
