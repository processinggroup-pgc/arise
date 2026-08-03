import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260804200000_work_item_lifecycle_states.sql",
);

describe("work item lifecycle states migration", () => {
  it("expands arise_work_items state check for the ARISE lifecycle", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("arise_work_items_state_check");
    expect(sql).toContain("'assessing'");
    expect(sql).toContain("'ready_for_recommendation'");
    expect(sql).toContain("'release_review'");
    expect(sql).toContain("'cancelled'");
  });
});
