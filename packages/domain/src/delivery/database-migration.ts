export const MIGRATION_RISK_LEVELS = ["low", "medium", "high", "destructive"] as const;
export type MigrationRiskLevel = (typeof MIGRATION_RISK_LEVELS)[number];

export const MIGRATION_EXECUTION_STATUSES = [
  "pending",
  "passed",
  "failed",
  "not_required",
] as const;
export type MigrationExecutionStatus = (typeof MIGRATION_EXECUTION_STATUSES)[number];

export const SUPABASE_PREVIEW_BRANCH_STATUSES = [
  "provisioning",
  "ready",
  "error",
  "deleted",
] as const;
export type SupabasePreviewBranchStatus = (typeof SUPABASE_PREVIEW_BRANCH_STATUSES)[number];

export interface DatabaseMigration {
  id: string;
  organizationId: string;
  workItemId: string;
  previewBranchId?: string;
  filePath: string;
  checksum: string;
  riskLevel: MigrationRiskLevel;
  forwardStatus: MigrationExecutionStatus;
  rollbackStatus: MigrationExecutionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupabasePreviewBranch {
  id: string;
  organizationId: string;
  workItemId: string;
  externalId: string;
  branchName: string;
  projectRef: string;
  status: SupabasePreviewBranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MigrationValidationEvaluation {
  passed: boolean;
  blockers: string[];
}

export interface CreateDatabaseMigrationInput {
  organizationId: string;
  workItemId: string;
  previewBranchId?: string;
  filePath: string;
  checksum: string;
  riskLevel: string;
  forwardStatus?: MigrationExecutionStatus;
  rollbackStatus?: MigrationExecutionStatus;
}

export interface CreateDatabaseMigrationMetadata {
  id: string;
  createdAt: Date;
}

export interface CreateSupabasePreviewBranchInput {
  organizationId: string;
  workItemId: string;
  externalId: string;
  branchName: string;
  projectRef: string;
  status?: SupabasePreviewBranchStatus;
}

export interface CreateSupabasePreviewBranchMetadata {
  id: string;
  createdAt: Date;
}

const MIGRATION_PATH_PATTERN = /^supabase\/migrations\/.+\.sql$/u;

function assertMigrationRiskLevel(riskLevel: string): MigrationRiskLevel {
  if (!(MIGRATION_RISK_LEVELS as readonly string[]).includes(riskLevel)) {
    throw new Error("Migration risk level is invalid");
  }

  return riskLevel as MigrationRiskLevel;
}

function assertMigrationExecutionStatus(status: string): MigrationExecutionStatus {
  if (!(MIGRATION_EXECUTION_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Migration execution status is invalid");
  }

  return status as MigrationExecutionStatus;
}

function assertSupabasePreviewBranchStatus(status: string): SupabasePreviewBranchStatus {
  if (!(SUPABASE_PREVIEW_BRANCH_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Supabase preview branch status is invalid");
  }

  return status as SupabasePreviewBranchStatus;
}

export function requiresSupabasePreviewBranch(input: { changedPaths: string[] }): boolean {
  return input.changedPaths.some((path) => MIGRATION_PATH_PATTERN.test(path.trim()));
}

export function createDatabaseMigration(
  input: CreateDatabaseMigrationInput,
  metadata: CreateDatabaseMigrationMetadata,
): DatabaseMigration {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();
  const filePath = input.filePath.trim();
  const checksum = input.checksum.trim();

  if (organizationId.length === 0 || workItemId.length === 0) {
    throw new Error("Database migration identifiers are required");
  }

  if (filePath.length === 0 || checksum.length === 0) {
    throw new Error("Database migration file path and checksum are required");
  }

  if (!MIGRATION_PATH_PATTERN.test(filePath)) {
    throw new Error("Database migration file path is invalid");
  }

  const migration: DatabaseMigration = {
    id: metadata.id,
    organizationId,
    workItemId,
    filePath,
    checksum,
    riskLevel: assertMigrationRiskLevel(input.riskLevel.trim()),
    forwardStatus: assertMigrationExecutionStatus(input.forwardStatus ?? "pending"),
    rollbackStatus: assertMigrationExecutionStatus(input.rollbackStatus ?? "not_required"),
    createdAt: metadata.createdAt,
    updatedAt: metadata.createdAt,
  };

  if (input.previewBranchId !== undefined) {
    const previewBranchId = input.previewBranchId.trim();
    if (previewBranchId.length === 0) {
      throw new Error("Database migration preview branch id is invalid");
    }

    migration.previewBranchId = previewBranchId;
  }

  return migration;
}

export function createSupabasePreviewBranch(
  input: CreateSupabasePreviewBranchInput,
  metadata: CreateSupabasePreviewBranchMetadata,
): SupabasePreviewBranch {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();
  const externalId = input.externalId.trim();
  const branchName = input.branchName.trim();
  const projectRef = input.projectRef.trim();

  if (
    organizationId.length === 0 ||
    workItemId.length === 0 ||
    externalId.length === 0 ||
    branchName.length === 0 ||
    projectRef.length === 0
  ) {
    throw new Error("Supabase preview branch identifiers are required");
  }

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    externalId,
    branchName,
    projectRef,
    status: assertSupabasePreviewBranchStatus(input.status ?? "provisioning"),
    createdAt: metadata.createdAt,
    updatedAt: metadata.createdAt,
  };
}

export function updateSupabasePreviewBranchStatus(
  branch: SupabasePreviewBranch,
  status: SupabasePreviewBranchStatus,
  updatedAt: Date,
): SupabasePreviewBranch {
  return {
    ...branch,
    status: assertSupabasePreviewBranchStatus(status),
    updatedAt,
  };
}

export function updateDatabaseMigrationValidation(
  migration: DatabaseMigration,
  input: {
    forwardStatus: MigrationExecutionStatus;
    rollbackStatus: MigrationExecutionStatus;
  },
  updatedAt: Date,
): DatabaseMigration {
  return {
    ...migration,
    forwardStatus: assertMigrationExecutionStatus(input.forwardStatus),
    rollbackStatus: assertMigrationExecutionStatus(input.rollbackStatus),
    updatedAt,
  };
}

export function evaluateMigrationValidation(input: {
  forwardStatus: MigrationExecutionStatus;
  rollbackStatus: MigrationExecutionStatus;
  schemaValid: boolean;
}): MigrationValidationEvaluation {
  const blockers: string[] = [];

  if (input.forwardStatus !== "passed") {
    blockers.push(`Forward migration status is ${input.forwardStatus}`);
  }

  if (input.rollbackStatus === "failed") {
    blockers.push("Rollback migration validation failed");
  }

  if (!input.schemaValid) {
    blockers.push("Supabase schema validation failed on preview branch");
  }

  return {
    passed: blockers.length === 0,
    blockers,
  };
}

export function mapSupabaseBranchStatus(status: string): SupabasePreviewBranchStatus {
  switch (status) {
    case "provisioning":
    case "ready":
    case "error":
    case "deleted":
      return status;
    default:
      throw new Error("Supabase branch status is invalid");
  }
}

export function mapSupabaseMigrationValidationStatus(passed: boolean): MigrationExecutionStatus {
  return passed ? "passed" : "failed";
}
