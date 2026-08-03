import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260811200000_incidents.sql",
);

describe("incidents migration", () => {
  it("defines tenant-scoped incidents with timeline and containment payloads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.incidents");
    expect(sql).toContain("references public.organizations (id)");
    expect(sql).toContain("timeline_json jsonb not null");
    expect(sql).toContain("containment_json jsonb not null");
    expect(sql).toContain("revoked_credential_refs jsonb not null");
    expect(sql).toContain("incidents_tenant_isolation_select");
    expect(sql).toContain("incidents_tenant_isolation_update");
  });
});
