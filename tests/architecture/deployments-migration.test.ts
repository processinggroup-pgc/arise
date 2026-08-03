import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260810100000_deployments.sql",
);

describe("deployments migration", () => {
  it("defines tenant-scoped deployments with preview references", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.deployments");
    expect(sql).toContain("references public.repositories (id)");
    expect(sql).toContain("references public.pull_requests (id)");
    expect(sql).toContain("preview_ref text not null");
    expect(sql).toContain("deployments_tenant_isolation_update");
  });
});
