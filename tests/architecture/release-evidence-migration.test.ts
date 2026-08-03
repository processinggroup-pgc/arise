import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260809200000_release_evidence.sql",
);

describe("release evidence migration", () => {
  it("defines tenant-scoped release evidence with structured json payloads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.release_evidence");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("requirement_coverage jsonb not null");
    expect(sql).toContain("release_evidence_tenant_isolation_select");
    expect(sql).toContain("release_evidence_tenant_isolation_update");
  });
});
