import {
  createDatabaseMigration,
  evaluateMigrationValidation,
  mapSupabaseMigrationValidationStatus,
  updateDatabaseMigrationValidation,
  updateSupabasePreviewBranchStatus,
  type DatabaseMigration,
  type MigrationValidationEvaluation,
  type TenantContext,
} from "@arise/domain";
import type { SupabasePreviewPort } from "@arise/integration-supabase";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type {
  DatabaseMigrationStore,
  SupabasePreviewBranchStore,
} from "./database-migration-store.js";

export interface ValidateDatabaseMigrationCommand {
  tenantContext: TenantContext;
  workItemId: string;
  previewBranchId: string;
  filePath: string;
  checksum: string;
  riskLevel: string;
  migrationContentForValidation?: string;
}

export interface ValidateDatabaseMigrationResult {
  migration: DatabaseMigration;
  evaluation: MigrationValidationEvaluation;
}

export async function validateDatabaseMigration(
  command: ValidateDatabaseMigrationCommand,
  previewBranchStore: SupabasePreviewBranchStore,
  migrationStore: DatabaseMigrationStore,
  supabasePreviewPort: SupabasePreviewPort,
  operationContext: IdentityOperationContext,
): Promise<ValidateDatabaseMigrationResult> {
  const previewBranch = await previewBranchStore.findSupabasePreviewBranchById(
    command.previewBranchId,
  );
  if (previewBranch === undefined) {
    throw new AgentRunScopeError("Supabase preview branch was not found");
  }

  if (previewBranch.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Supabase preview branch is outside the tenant scope");
  }

  if (previewBranch.workItemId !== command.workItemId) {
    throw new AgentRunScopeError("Supabase preview branch work item mismatch");
  }

  const validation = await supabasePreviewPort.validateSchema({
    projectRef: previewBranch.projectRef,
    branchExternalId: previewBranch.externalId,
    migrationPaths: [command.filePath],
  });

  const forwardStatus = mapSupabaseMigrationValidationStatus(validation.passed);
  const evaluation = evaluateMigrationValidation({
    forwardStatus,
    rollbackStatus: "not_required",
    schemaValid: validation.passed,
  });

  const migration = createDatabaseMigration(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      previewBranchId: previewBranch.id,
      filePath: command.filePath,
      checksum: command.checksum,
      riskLevel: command.riskLevel,
      forwardStatus,
      rollbackStatus: "not_required",
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await migrationStore.saveDatabaseMigration(migration);

  const updatedBranch = updateSupabasePreviewBranchStatus(
    previewBranch,
    validation.passed ? "ready" : "error",
    operationContext.now(),
  );
  await previewBranchStore.saveSupabasePreviewBranch(updatedBranch);

  const finalizedMigration = updateDatabaseMigrationValidation(
    migration,
    {
      forwardStatus,
      rollbackStatus: "not_required",
    },
    operationContext.now(),
  );
  await migrationStore.saveDatabaseMigration(finalizedMigration);

  return {
    migration: finalizedMigration,
    evaluation,
  };
}
