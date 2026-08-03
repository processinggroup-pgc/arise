export interface CreateSupabasePreviewBranchRequest {
  projectRef: string;
  gitBranch: string;
  idempotencyKey: string;
}

export interface SupabasePreviewBranchRecord {
  externalId: string;
  branchName: string;
  projectRef: string;
  status: "provisioning" | "ready" | "error" | "deleted";
  databaseUrlRef: string;
}

export interface ValidateSupabaseSchemaRequest {
  projectRef: string;
  branchExternalId: string;
  migrationPaths: string[];
}

export interface SupabaseSchemaValidationResult {
  passed: boolean;
  validatedMigrationPaths: string[];
  findings: string[];
}

export interface SupabasePreviewPort {
  createPreviewBranch(
    request: CreateSupabasePreviewBranchRequest,
  ): Promise<SupabasePreviewBranchRecord>;
  validateSchema(request: ValidateSupabaseSchemaRequest): Promise<SupabaseSchemaValidationResult>;
}

export class SupabasePreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabasePreviewError";
  }
}
