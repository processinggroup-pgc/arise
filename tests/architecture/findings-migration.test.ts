import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260809100000_findings.sql",
);

describe("findings migration", () => {
  it("defines tenant-scoped findings with lifecycle statuses", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.findings");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("'false_positive'");
    expect(sql).toContain("findings_tenant_isolation_select");
    expect(sql).toContain("findings_tenant_isolation_update");
  });
});
