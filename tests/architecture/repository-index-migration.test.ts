import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260805100000_repository_files_and_symbols.sql",
);

describe("repository files and symbols migration", () => {
  it("defines tenant-scoped repository indexes for files and symbols", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.repository_files");
    expect(sql).toContain("create table if not exists public.repository_symbols");
    expect(sql).toContain("content_hash text not null");
    expect(sql).toContain("unique (repository_id, path)");
    expect(sql).toContain(
      "kind text not null check (kind in ('function', 'class', 'interface', 'type', 'variable'))",
    );
    expect(sql).toContain("repository_files_tenant_isolation_select");
    expect(sql).toContain("repository_symbols_tenant_isolation_delete");
  });
});
