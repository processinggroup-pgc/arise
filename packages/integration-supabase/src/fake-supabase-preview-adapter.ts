import {
  SupabasePreviewError,
  type CreateSupabasePreviewBranchRequest,
  type SupabasePreviewBranchRecord,
  type SupabasePreviewPort,
  type SupabaseSchemaValidationResult,
  type ValidateSupabaseSchemaRequest,
} from "./supabase-preview-port.js";

export interface FakeSupabasePreviewBranchFixture extends SupabasePreviewBranchRecord {
  validationResults?: SupabaseSchemaValidationResult[];
}

function branchKey(projectRef: string, externalId: string): string {
  return `${projectRef.trim()}:${externalId.trim()}`;
}

export class FakeSupabasePreviewAdapter implements SupabasePreviewPort {
  private readonly idempotentBranches = new Map<string, SupabasePreviewBranchRecord>();
  private readonly branches = new Map<string, FakeSupabasePreviewBranchFixture>();
  private nextBranchId = 200;

  constructor(fixtures: FakeSupabasePreviewBranchFixture[] = []) {
    for (const fixture of fixtures) {
      this.branches.set(branchKey(fixture.projectRef, fixture.externalId), fixture);
    }
  }

  createPreviewBranch(
    request: CreateSupabasePreviewBranchRequest,
  ): Promise<SupabasePreviewBranchRecord> {
    const idempotencyKey = request.idempotencyKey.trim();
    if (idempotencyKey.length === 0) {
      return Promise.reject(
        new SupabasePreviewError("Supabase preview branch idempotency key is required"),
      );
    }

    const existing = this.idempotentBranches.get(idempotencyKey);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const externalId = `branch_${String(++this.nextBranchId)}`;
    const branchName = `preview/${request.gitBranch.replaceAll("/", "-")}`;
    const record: SupabasePreviewBranchRecord = {
      externalId,
      branchName,
      projectRef: request.projectRef.trim(),
      status: "provisioning",
      databaseUrlRef: `supabase://${request.projectRef}/${branchName}`,
    };

    this.idempotentBranches.set(idempotencyKey, record);
    this.branches.set(branchKey(request.projectRef, externalId), {
      ...record,
      validationResults: [],
    });

    return Promise.resolve(record);
  }

  validateSchema(request: ValidateSupabaseSchemaRequest): Promise<SupabaseSchemaValidationResult> {
    const fixture = this.branches.get(branchKey(request.projectRef, request.branchExternalId));
    if (fixture === undefined) {
      return Promise.reject(
        new SupabasePreviewError(
          `Preview branch ${request.branchExternalId} was not found for project ${request.projectRef}`,
        ),
      );
    }

    if (fixture.validationResults !== undefined && fixture.validationResults.length > 0) {
      const next = fixture.validationResults.shift();
      if (next !== undefined) {
        return Promise.resolve(next);
      }
    }

    const hasDestructiveMigration = request.migrationPaths.some((path) =>
      /destructive/iu.test(path),
    );

    return Promise.resolve({
      passed: !hasDestructiveMigration,
      validatedMigrationPaths: request.migrationPaths,
      findings: hasDestructiveMigration ? ["Destructive migration requires elevated approval"] : [],
    });
  }

  markBranchReady(projectRef: string, branchExternalId: string): void {
    const key = branchKey(projectRef, branchExternalId);
    const fixture = this.branches.get(key);
    if (fixture === undefined) {
      throw new SupabasePreviewError(`Preview branch ${branchExternalId} was not found`);
    }

    const updated: FakeSupabasePreviewBranchFixture = {
      ...fixture,
      status: "ready",
    };
    this.branches.set(key, updated);

    for (const [idempotencyKey, record] of this.idempotentBranches.entries()) {
      if (record.externalId === branchExternalId) {
        this.idempotentBranches.set(idempotencyKey, {
          ...record,
          status: "ready",
        });
      }
    }
  }
}
