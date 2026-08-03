import {
  VercelPreviewError,
  type CreateVercelPreviewRequest,
  type ReadVercelDeploymentRequest,
  type VercelDeploymentRecord,
  type VercelPreviewPort,
} from "./vercel-preview-port.js";

export interface FakeVercelDeploymentFixture extends VercelDeploymentRecord {
  projectId: string;
}

function deploymentKey(projectId: string, externalId: string): string {
  return `${projectId.trim()}:${externalId.trim()}`;
}

export class FakeVercelPreviewAdapter implements VercelPreviewPort {
  private readonly idempotentDeployments = new Map<string, VercelDeploymentRecord>();
  private readonly deployments = new Map<string, FakeVercelDeploymentFixture>();
  private nextDeploymentId = 100;

  constructor(fixtures: FakeVercelDeploymentFixture[] = []) {
    for (const fixture of fixtures) {
      this.deployments.set(deploymentKey(fixture.projectId, fixture.externalId), fixture);
    }
  }

  createPreview(request: CreateVercelPreviewRequest): Promise<VercelDeploymentRecord> {
    const idempotencyKey = request.idempotencyKey.trim();
    if (idempotencyKey.length === 0) {
      return Promise.reject(new VercelPreviewError("Vercel preview idempotency key is required"));
    }

    const existing = this.idempotentDeployments.get(idempotencyKey);
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const externalId = `dpl_${String(++this.nextDeploymentId)}`;
    const record: VercelDeploymentRecord = {
      externalId,
      previewUrl: `https://${request.projectId}-${request.gitBranch.replaceAll("/", "-")}.vercel.app`,
      status: "building",
      gitBranch: request.gitBranch.trim(),
      gitCommitSha: request.gitCommitSha.trim(),
    };

    this.idempotentDeployments.set(idempotencyKey, record);
    this.deployments.set(deploymentKey(request.projectId, externalId), {
      projectId: request.projectId,
      ...record,
    });

    return Promise.resolve(record);
  }

  readDeployment(request: ReadVercelDeploymentRequest): Promise<VercelDeploymentRecord> {
    const fixture = this.deployments.get(
      deploymentKey(request.projectId, request.deploymentExternalId),
    );

    if (fixture === undefined) {
      return Promise.reject(
        new VercelPreviewError(
          `Deployment ${request.deploymentExternalId} was not found for project ${request.projectId}`,
        ),
      );
    }

    return Promise.resolve({
      externalId: fixture.externalId,
      previewUrl: fixture.previewUrl,
      status: fixture.status,
      gitBranch: fixture.gitBranch,
      gitCommitSha: fixture.gitCommitSha,
    });
  }

  updateDeploymentStatus(
    projectId: string,
    deploymentExternalId: string,
    status: VercelDeploymentRecord["status"],
  ): void {
    const key = deploymentKey(projectId, deploymentExternalId);
    const fixture = this.deployments.get(key);
    if (fixture === undefined) {
      throw new VercelPreviewError(`Deployment ${deploymentExternalId} was not found`);
    }

    const updated: FakeVercelDeploymentFixture = {
      ...fixture,
      status,
    };
    this.deployments.set(key, updated);

    for (const [idempotencyKey, record] of this.idempotentDeployments.entries()) {
      if (record.externalId === deploymentExternalId) {
        this.idempotentDeployments.set(idempotencyKey, {
          ...record,
          status,
        });
      }
    }
  }
}
