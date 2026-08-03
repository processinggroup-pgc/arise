import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804400000_approvals.sql",
);

describe("approvals migration", () => {
  it("defines tenant-scoped approvals with lifecycle statuses", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.approvals");
    expect(sql).toContain("approval_type text not null");
    expect(sql).toContain("'plan_approval'");
    expect(sql).toContain("'pending', 'approved', 'rejected', 'expired', 'revoked'");
    expect(sql).toContain("approvals_tenant_isolation_select");
    expect(sql).toContain("approvals_tenant_isolation_update");
  });
});
