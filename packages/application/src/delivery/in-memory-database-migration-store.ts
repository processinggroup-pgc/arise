import type { DatabaseMigration, SupabasePreviewBranch } from "@arise/domain";

import type {
  DatabaseMigrationStore,
  SupabasePreviewBranchStore,
} from "./database-migration-store.js";

export class InMemoryDatabaseMigrationStore implements DatabaseMigrationStore {
  private readonly migrations = new Map<string, DatabaseMigration>();

  saveDatabaseMigration(migration: DatabaseMigration): Promise<void> {
    this.migrations.set(migration.id, migration);
    return Promise.resolve();
  }

  findDatabaseMigrationById(id: string): Promise<DatabaseMigration | undefined> {
    return Promise.resolve(this.migrations.get(id));
  }

  listDatabaseMigrationsForWorkItem(workItemId: string): Promise<DatabaseMigration[]> {
    return Promise.resolve(
      [...this.migrations.values()]
        .filter((migration) => migration.workItemId === workItemId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}

export class InMemorySupabasePreviewBranchStore implements SupabasePreviewBranchStore {
  private readonly branches = new Map<string, SupabasePreviewBranch>();

  saveSupabasePreviewBranch(branch: SupabasePreviewBranch): Promise<void> {
    this.branches.set(branch.id, branch);
    return Promise.resolve();
  }

  findSupabasePreviewBranchById(id: string): Promise<SupabasePreviewBranch | undefined> {
    return Promise.resolve(this.branches.get(id));
  }

  findSupabasePreviewBranchByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<SupabasePreviewBranch | undefined> {
    return Promise.resolve(
      [...this.branches.values()].find(
        (branch) => branch.organizationId === organizationId && branch.externalId === externalId,
      ),
    );
  }

  listSupabasePreviewBranchesForWorkItem(workItemId: string): Promise<SupabasePreviewBranch[]> {
    return Promise.resolve(
      [...this.branches.values()]
        .filter((branch) => branch.workItemId === workItemId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
