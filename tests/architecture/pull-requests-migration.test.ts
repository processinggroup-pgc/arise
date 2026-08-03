import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260810000000_pull_requests.sql",
);

describe("pull requests migration", () => {
  it("defines tenant-scoped pull requests linked to repositories and work items", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.pull_requests");
    expect(sql).toContain("references public.repositories (id)");
    expect(sql).toContain("references public.arise_work_items (id)");
    expect(sql).toContain("pull_requests_tenant_isolation_select");
    expect(sql).toContain("pull_requests_tenant_isolation_update");
  });
});
