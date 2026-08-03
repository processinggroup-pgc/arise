import { describe, expect, it } from "vitest";

import { FakeSupabasePreviewAdapter } from "./fake-supabase-preview-adapter.js";
import { SupabasePreviewError } from "./supabase-preview-port.js";

describe("FakeSupabasePreviewAdapter", () => {
  it("creates an isolated preview branch", async () => {
    const adapter = new FakeSupabasePreviewAdapter();

    const branch = await adapter.createPreviewBranch({
      projectRef: "arise",
      gitBranch: "feature/onboarding",
      idempotencyKey: "branch_key_1",
    });

    expect(branch.externalId).toMatch(/^branch_/);
    expect(branch.databaseUrlRef).toContain("supabase://");
    expect(branch.status).toBe("provisioning");
  });

  it("replays branch creation for the same idempotency key", async () => {
    const adapter = new FakeSupabasePreviewAdapter();
    const request = {
      projectRef: "arise",
      gitBranch: "feature/onboarding",
      idempotencyKey: "branch_key_1",
    };

    const first = await adapter.createPreviewBranch(request);
    const second = await adapter.createPreviewBranch(request);

    expect(second.externalId).toBe(first.externalId);
  });

  it("validates schema on the preview branch", async () => {
    const adapter = new FakeSupabasePreviewAdapter();
    const branch = await adapter.createPreviewBranch({
      projectRef: "arise",
      gitBranch: "feature/onboarding",
      idempotencyKey: "branch_key_2",
    });

    adapter.markBranchReady("arise", branch.externalId);

    const result = await adapter.validateSchema({
      projectRef: "arise",
      branchExternalId: branch.externalId,
      migrationPaths: ["supabase/migrations/20260810200000_users.sql"],
    });

    expect(result.passed).toBe(true);
    expect(result.validatedMigrationPaths).toHaveLength(1);
  });

  it("rejects unknown preview branch validation", async () => {
    const adapter = new FakeSupabasePreviewAdapter();

    await expect(
      adapter.validateSchema({
        projectRef: "arise",
        branchExternalId: "missing",
        migrationPaths: ["supabase/migrations/20260810200000_users.sql"],
      }),
    ).rejects.toBeInstanceOf(SupabasePreviewError);
  });
});
