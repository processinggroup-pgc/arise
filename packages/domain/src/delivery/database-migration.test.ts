import { describe, expect, it } from "vitest";

import {
  createDatabaseMigration,
  createSupabasePreviewBranch,
  evaluateMigrationValidation,
  requiresSupabasePreviewBranch,
} from "./database-migration.js";

describe("database migration delivery", () => {
  it("requires an isolated preview branch for database-changing work items", () => {
    expect(
      requiresSupabasePreviewBranch({
        changedPaths: ["supabase/migrations/20260810200000_users.sql"],
      }),
    ).toBe(true);
    expect(
      requiresSupabasePreviewBranch({
        changedPaths: ["src/memberships/route.ts"],
      }),
    ).toBe(false);
  });

  it("creates migration and preview branch records", () => {
    const migration = createDatabaseMigration(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        filePath: "supabase/migrations/20260810200000_users.sql",
        checksum: "abc123",
        riskLevel: "medium",
      },
      {
        id: "migration_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );
    const branch = createSupabasePreviewBranch(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        externalId: "branch_1",
        branchName: "preview/work_item_1",
        projectRef: "arise",
      },
      {
        id: "preview_branch_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(migration.forwardStatus).toBe("pending");
    expect(branch.status).toBe("provisioning");
  });

  it("passes validation only when forward migration succeeds on the preview branch", () => {
    const passed = evaluateMigrationValidation({
      forwardStatus: "passed",
      rollbackStatus: "not_required",
      schemaValid: true,
    });
    const failed = evaluateMigrationValidation({
      forwardStatus: "failed",
      rollbackStatus: "not_required",
      schemaValid: true,
    });

    expect(passed.passed).toBe(true);
    expect(failed.passed).toBe(false);
  });
});
