import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260818100000_user_profile_upsert.sql",
);

describe("user profile bootstrap migration", () => {
  it("defines an idempotent user profile preparation helper", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_prepare_user_profile");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain("grant execute on function public.arise_prepare_user_profile");
  });
});
