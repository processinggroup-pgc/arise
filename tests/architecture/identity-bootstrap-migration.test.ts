import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260817000000_identity_bootstrap.sql",
);

describe("identity bootstrap migration", () => {
  it("defines user-scoped bootstrap policies and slug lookup helper", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_find_organization_by_slug");
    expect(sql).toContain("organization_memberships_user_bootstrap_select");
    expect(sql).toContain("organizations_user_bootstrap_select");
    expect(sql).toContain("organizations_bootstrap_insert");
    expect(sql).toContain("organization_memberships_bootstrap_insert");
    expect(sql).toContain("user_profiles_bootstrap_insert");
    expect(sql).toContain("grant insert, update on public.organizations to arise_app");
  });
});
