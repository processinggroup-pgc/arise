import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260805200000_repository_dependencies_and_test_maps.sql",
);

describe("repository dependencies and test maps migration", () => {
  it("defines tenant-scoped dependency and test map indexes", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.repository_dependencies");
    expect(sql).toContain("create table if not exists public.repository_test_maps");
    expect(sql).toContain(
      "kind text not null check (kind in ('relative_import', 'package_import'))",
    );
    expect(sql).toContain("tested_file_path text not null");
    expect(sql).toContain("repository_dependencies_tenant_isolation_select");
    expect(sql).toContain("repository_test_maps_tenant_isolation_delete");
  });
});
