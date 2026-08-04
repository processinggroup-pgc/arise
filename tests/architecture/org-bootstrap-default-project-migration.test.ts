import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260818000000_org_bootstrap_default_project.sql",
);

describe("org bootstrap default project migration", () => {
  it("defines bootstrap helpers for owner profiles and default projects", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_prepare_user_profile");
    expect(sql).toContain("arise_create_default_project");
    expect(sql).toContain("grant execute on function public.arise_prepare_user_profile");
    expect(sql).toContain("grant execute on function public.arise_create_default_project");
    expect(sql).toContain("grant select, insert on public.projects to arise_app");
  });
});
