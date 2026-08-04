import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260818300000_register_organization.sql",
);

describe("register organization migration", () => {
  it("defines an atomic security-definer registration helper and role grants", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_register_organization");
    expect(sql).toContain("security definer");
    expect(sql).toContain("grant arise_app to");
    expect(sql).toContain("organizations_bootstrap_insert");
    expect(sql).toContain("grant execute on function public.arise_register_organization");
  });
});
