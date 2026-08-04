import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORKSPACE_ERROR_CODES,
  resolveWorkspaceErrorMessage,
} from "../../apps/web/src/lib/workspace-errors";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260818200000_default_project_active_member.sql",
);

describe("workspace error messaging", () => {
  it("maps known workspace error codes to user-visible messages", () => {
    expect(resolveWorkspaceErrorMessage(WORKSPACE_ERROR_CODES.membershipRequired)).toContain(
      "active membership",
    );
    expect(resolveWorkspaceErrorMessage(WORKSPACE_ERROR_CODES.workspaceSetupFailed)).toContain(
      "default project",
    );
  });

  it("falls back for unknown workspace error codes", () => {
    expect(resolveWorkspaceErrorMessage("unexpected")).toContain("Workspace activation failed");
  });
});

describe("default project active member migration", () => {
  it("allows active members to bootstrap default projects", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("om.status = 'active'");
    expect(sql).not.toContain("om.role = 'owner'");
  });
});
