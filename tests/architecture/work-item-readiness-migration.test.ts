import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804300000_work_item_readiness_fields.sql",
);

describe("work item readiness fields migration", () => {
  it("adds readiness intent columns to arise_work_items", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("current_behavior text not null");
    expect(sql).toContain("measurable_outcome text not null");
    expect(sql).toContain("affected_systems jsonb not null");
    expect(sql).toContain("decision_authority text not null");
    expect(sql).toContain("unresolved_questions jsonb not null");
  });
});
