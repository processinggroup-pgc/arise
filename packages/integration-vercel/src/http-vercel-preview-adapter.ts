import { vercelApiRequest, type VercelApiClientConfig } from "./vercel-api-client.js";
import {
  VercelPreviewError,
  type CreateVercelPreviewRequest,
  type ReadVercelDeploymentRequest,
  type VercelDeploymentRecord,
  type VercelPreviewPort,
} from "./vercel-preview-port.js";

interface VercelDeploymentResponse {
  id: string;
  url?: string;
  readyState?: string;
  meta?: { githubCommitSha?: string; githubCommitRef?: string };
}

function mapReadyState(status: string | undefined): VercelDeploymentRecord["status"] {
  switch (status) {
    case "READY":
      return "ready";
    case "ERROR":
      return "error";
    case "CANCELED":
      return "cancelled";
    case "BUILDING":
    case "INITIALIZING":
      return "building";
    default:
      return "queued";
  }
}

function mapDeploymentResponse(
  response: VercelDeploymentResponse,
  fallback: { gitBranch: string; gitCommitSha: string },
): VercelDeploymentRecord {
  return {
    externalId: response.id,
    previewUrl: response.url ?? `https://${response.id}.vercel.app`,
    status: mapReadyState(response.readyState),
    gitBranch: response.meta?.githubCommitRef ?? fallback.gitBranch,
    gitCommitSha: response.meta?.githubCommitSha ?? fallback.gitCommitSha,
  };
}

export class HttpVercelPreviewAdapter implements VercelPreviewPort {
  constructor(private readonly config: VercelApiClientConfig) {}

  async createPreview(request: CreateVercelPreviewRequest): Promise<VercelDeploymentRecord> {
    const response = await vercelApiRequest<VercelDeploymentResponse>("/v13/deployments", this.config, {
      method: "POST",
      body: {
        name: request.projectId,
        project: request.projectId,
        target: "preview",
        gitSource: {
          type: "github",
          ref: request.gitBranch,
          sha: request.gitCommitSha,
        },
      },
    });

    return mapDeploymentResponse(response, {
      gitBranch: request.gitBranch,
      gitCommitSha: request.gitCommitSha,
    });
  }

  async readDeployment(request: ReadVercelDeploymentRequest): Promise<VercelDeploymentRecord> {
    const response = await vercelApiRequest<VercelDeploymentResponse>(
      `/v13/deployments/${encodeURIComponent(request.deploymentExternalId)}`,
      this.config,
    );

    return mapDeploymentResponse(response, {
      gitBranch: "",
      gitCommitSha: "",
    });
  }
}

export class DisabledVercelPreviewAdapter implements VercelPreviewPort {
  createPreview(): Promise<VercelDeploymentRecord> {
    return Promise.reject(
      new VercelPreviewError("Vercel preview deployments require a linked GitHub repository"),
    );
  }

  readDeployment(): Promise<VercelDeploymentRecord> {
    return Promise.reject(new VercelPreviewError("Vercel preview deployments are not configured"));
  }
}
