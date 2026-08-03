import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260808000000_execution_evidence.sql",
);

describe("execution evidence migration", () => {
  it("defines tenant-scoped execution evidence with diffs and commit metadata", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.execution_evidence");
    expect(sql).toContain("references public.execution_sessions (id)");
    expect(sql).toContain("references public.agent_runs (id)");
    expect(sql).toContain("commit_id text not null");
    expect(sql).toContain("diffs_json jsonb not null");
    expect(sql).toContain("execution_evidence_tenant_isolation_select");
    expect(sql).toContain("execution_evidence_tenant_isolation_insert");
  });
});
