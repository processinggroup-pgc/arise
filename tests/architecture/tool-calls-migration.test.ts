import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260806100000_tool_calls.sql",
);

describe("tool calls migration", () => {
  it("defines tenant-scoped tool call records with idempotency protection", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.tool_calls");
    expect(sql).toContain("references public.agent_runs (id)");
    expect(sql).toContain("unique (agent_run_id, idempotency_key)");
    expect(sql).toContain("tool_calls_tenant_isolation_select");
    expect(sql).toContain("tool_calls_tenant_isolation_insert");
  });
});
