import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260803100000_tenant_rls.sql",
);

describe("tenant RLS migration", () => {
  it("defines session helpers, arise_app role, and tenant isolation policies", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_current_organization_id");
    expect(sql).toContain("arise_current_user_id");
    expect(sql).toContain("create role arise_app");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("organizations_tenant_isolation_select");
    expect(sql).toContain("organization_memberships_tenant_isolation_select");
    expect(sql).toContain("user_profiles_tenant_isolation_select");
    expect(sql).toContain("app.current_organization_id");
    expect(sql).toContain("app.current_user_id");
  });
});
