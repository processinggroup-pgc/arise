import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260803000000_identity.sql",
);

describe("identity migration", () => {
  it("defines organizations, user profiles, and memberships", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.organizations");
    expect(sql).toContain("create table if not exists public.user_profiles");
    expect(sql).toContain("create table if not exists public.organization_memberships");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("unique (organization_id, user_id)");
  });
});
