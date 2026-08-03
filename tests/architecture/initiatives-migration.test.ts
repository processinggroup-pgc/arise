import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260812000000_initiatives.sql",
);

describe("initiatives migration", () => {
  it("defines initiative discovery tables", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.initiatives");
    expect(sql).toContain("create table if not exists public.problem_briefs");
    expect(sql).toContain("create table if not exists public.market_research_dossiers");
    expect(sql).toContain("create table if not exists public.problem_alignments");
    expect(sql).toContain("enable row level security");
  });
});
