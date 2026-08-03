import { vercelApiRequest, type VercelApiClientConfig } from "./vercel-api-client.js";
import {
  VercelProjectError,
  type CreateVercelProjectRequest,
  type ValidateVercelCredentialsRequest,
  type VercelProjectPort,
  type VercelProjectRecord,
} from "./vercel-project-port.js";

interface VercelCreateProjectResponse {
  id: string;
  name: string;
  link?: string;
}

export class HttpVercelProjectAdapter implements VercelProjectPort {
  constructor(private readonly config: VercelApiClientConfig) {}

  async validateCredentials(request: ValidateVercelCredentialsRequest): Promise<void> {
    if (this.config.token.trim().length === 0) {
      throw new VercelProjectError("Vercel token is required");
    }

    if (request.teamId.trim().length === 0) {
      throw new VercelProjectError("Vercel team ID is required");
    }

    await vercelApiRequest<{ id: string }>(
      `/v2/teams/${encodeURIComponent(request.teamId.trim())}`,
      this.config,
    );
  }

  async createProject(request: CreateVercelProjectRequest): Promise<VercelProjectRecord> {
    const name = request.name.trim();
    if (name.length === 0) {
      throw new VercelProjectError("Vercel project name is required");
    }

    const body: Record<string, unknown> = {
      name,
      ...(request.framework !== undefined ? { framework: request.framework } : {}),
      ...(request.rootDirectory !== undefined ? { rootDirectory: request.rootDirectory } : {}),
      ...(request.gitRepository !== undefined ? { gitRepository: request.gitRepository } : {}),
      ...(request.environmentVariables !== undefined && request.environmentVariables.length > 0
        ? {
            environmentVariables: request.environmentVariables.map((variable) => ({
              key: variable.key,
              value: variable.value,
              target: variable.target,
              type: "encrypted",
            })),
          }
        : {}),
    };

    const response = await vercelApiRequest<VercelCreateProjectResponse>("/v11/projects", this.config, {
      method: "POST",
      body,
    });

    if (response.id.trim().length === 0 || response.name.trim().length === 0) {
      throw new VercelProjectError("Vercel project creation returned an incomplete response");
    }

    return {
      projectId: response.id,
      projectName: response.name,
      projectUrl:
        response.link ??
        `https://vercel.com/dashboard/projects/${encodeURIComponent(response.name)}`,
    };
  }
}
