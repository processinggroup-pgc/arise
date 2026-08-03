export interface CreateVercelPreviewRequest {
  projectId: string;
  gitBranch: string;
  gitCommitSha: string;
  idempotencyKey: string;
}

export interface VercelDeploymentRecord {
  externalId: string;
  previewUrl: string;
  status: "queued" | "building" | "ready" | "error" | "cancelled";
  gitBranch: string;
  gitCommitSha: string;
}

export interface ReadVercelDeploymentRequest {
  projectId: string;
  deploymentExternalId: string;
}

export interface VercelPreviewPort {
  createPreview(request: CreateVercelPreviewRequest): Promise<VercelDeploymentRecord>;
  readDeployment(request: ReadVercelDeploymentRequest): Promise<VercelDeploymentRecord>;
}

export class VercelPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VercelPreviewError";
  }
}
