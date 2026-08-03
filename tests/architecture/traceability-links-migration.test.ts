import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804500000_traceability_links.sql",
);

describe("traceability links migration", () => {
  it("defines tenant-scoped explicit traceability links", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.traceability_links");
    expect(sql).toContain("work_item_lineage_id uuid not null");
    expect(sql).toContain("'automated_test'");
    expect(sql).toContain("'code_artifact'");
    expect(sql).toContain("'evidence'");
    expect(sql).toContain(
      "relationship text not null check (relationship in ('implements', 'evidences', 'validates'))",
    );
    expect(sql).toContain("traceability_links_tenant_isolation_select");
    expect(sql).toContain("traceability_links_tenant_isolation_insert");
  });
});
