import type { DatabaseMigration, SupabasePreviewBranch } from "@arise/domain";

export interface DatabaseMigrationStore {
  saveDatabaseMigration(migration: DatabaseMigration): Promise<void>;
  findDatabaseMigrationById(id: string): Promise<DatabaseMigration | undefined>;
  listDatabaseMigrationsForWorkItem(workItemId: string): Promise<DatabaseMigration[]>;
}

export interface SupabasePreviewBranchStore {
  saveSupabasePreviewBranch(branch: SupabasePreviewBranch): Promise<void>;
  findSupabasePreviewBranchById(id: string): Promise<SupabasePreviewBranch | undefined>;
  findSupabasePreviewBranchByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<SupabasePreviewBranch | undefined>;
  listSupabasePreviewBranchesForWorkItem(workItemId: string): Promise<SupabasePreviewBranch[]>;
}
