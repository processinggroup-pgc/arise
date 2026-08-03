import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter } from "@arise/integration-github";
import { FakeSupabasePreviewAdapter } from "@arise/integration-supabase";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import {
  InMemoryDatabaseMigrationStore,
  InMemorySupabasePreviewBranchStore,
} from "./in-memory-database-migration-store.js";
import { provisionSupabasePreviewBranch } from "./provision-supabase-preview-branch.js";
import { validateDatabaseMigration } from "./validate-database-migration.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_supabase_preview",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const githubFixture = {
  installationId: "install_123",
  owner: "PgC-git",
  name: "arise",
  externalId: "987654321",
  fullName: "PgC-git/arise",
  defaultBranch: "main",
  htmlUrl: "https://github.com/PgC-git/arise",
  private: true,
};

async function seedDeliveryScenario(): Promise<{
  workItemId: string;
  repositoryId: string;
  workItemStore: InMemoryWorkItemStore;
  repositoryStore: InMemoryRepositoryStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const githubPort = new FakeGitHubAdapter([githubFixture]);

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      title: "Add memberships table",
      type: "feature",
      riskLevel: "high",
      ownerId: "user_owner",
      problemStatement: "Membership data needs a dedicated table.",
      targetUser: "Platform engineer",
      desiredBehavior: "Membership records persist in Supabase.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A membership record",
          when: "It is saved",
          then: "It is stored in the memberships table",
        },
      ],
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  const repository = await connectRepositoryForProject(
    {
      tenantContext,
      projectId: project.id,
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
    },
    projectStore,
    repositoryStore,
    githubPort,
    operationContext,
  );

  return {
    workItemId: workItem.id,
    repositoryId: repository.id,
    workItemStore,
    repositoryStore,
  };
}

describe("provisionSupabasePreviewBranch", () => {
  it("provisions an isolated preview branch for database-changing paths", async () => {
    const seeded = await seedDeliveryScenario();
    const previewBranchStore = new InMemorySupabasePreviewBranchStore();
    const supabasePreviewPort = new FakeSupabasePreviewAdapter();

    const result = await provisionSupabasePreviewBranch(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        supabaseProjectRef: "arise",
        gitBranch: "feature/memberships-table",
        changedPaths: ["supabase/migrations/20260810200000_memberships.sql"],
        idempotencyKey: "branch_key_1",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      previewBranchStore,
      supabasePreviewPort,
      operationContext,
    );

    expect(result.previewRequired).toBe(true);
    expect(result.previewBranch.branchName).toContain("preview/");
    expect(result.idempotentReplay).toBe(false);
  });

  it("blocks preview provisioning when no database migrations changed", async () => {
    const seeded = await seedDeliveryScenario();
    const previewBranchStore = new InMemorySupabasePreviewBranchStore();

    await expect(
      provisionSupabasePreviewBranch(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          repositoryId: seeded.repositoryId,
          supabaseProjectRef: "arise",
          gitBranch: "feature/onboarding",
          changedPaths: ["src/memberships/route.ts"],
          idempotencyKey: "branch_key_2",
        },
        seeded.workItemStore,
        seeded.repositoryStore,
        previewBranchStore,
        new FakeSupabasePreviewAdapter(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});

describe("validateDatabaseMigration", () => {
  it("validates migrations against the isolated preview branch", async () => {
    const seeded = await seedDeliveryScenario();
    const previewBranchStore = new InMemorySupabasePreviewBranchStore();
    const migrationStore = new InMemoryDatabaseMigrationStore();
    const supabasePreviewPort = new FakeSupabasePreviewAdapter();

    const provisioned = await provisionSupabasePreviewBranch(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        supabaseProjectRef: "arise",
        gitBranch: "feature/memberships-table",
        changedPaths: ["supabase/migrations/20260810200000_memberships.sql"],
        idempotencyKey: "branch_key_3",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      previewBranchStore,
      supabasePreviewPort,
      operationContext,
    );

    supabasePreviewPort.markBranchReady("arise", provisioned.previewBranch.externalId);

    const result = await validateDatabaseMigration(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        previewBranchId: provisioned.previewBranch.id,
        filePath: "supabase/migrations/20260810200000_memberships.sql",
        checksum: "abc123",
        riskLevel: "medium",
      },
      previewBranchStore,
      migrationStore,
      supabasePreviewPort,
      operationContext,
    );

    expect(result.evaluation.passed).toBe(true);
    expect(result.migration.forwardStatus).toBe("passed");
  });

  it("fails validation for destructive migrations on the preview branch", async () => {
    const seeded = await seedDeliveryScenario();
    const previewBranchStore = new InMemorySupabasePreviewBranchStore();
    const migrationStore = new InMemoryDatabaseMigrationStore();
    const supabasePreviewPort = new FakeSupabasePreviewAdapter();

    const provisioned = await provisionSupabasePreviewBranch(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        supabaseProjectRef: "arise",
        gitBranch: "feature/destructive",
        changedPaths: ["supabase/migrations/20260810200000_destructive.sql"],
        idempotencyKey: "branch_key_4",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      previewBranchStore,
      supabasePreviewPort,
      operationContext,
    );

    const result = await validateDatabaseMigration(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        previewBranchId: provisioned.previewBranch.id,
        filePath: "supabase/migrations/20260810200000_destructive.sql",
        checksum: "def456",
        riskLevel: "destructive",
      },
      previewBranchStore,
      migrationStore,
      supabasePreviewPort,
      operationContext,
    );

    expect(result.evaluation.passed).toBe(false);
    expect(result.migration.forwardStatus).toBe("failed");
  });
});
