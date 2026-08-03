import {
  VercelProjectError,
  type CreateVercelProjectRequest,
  type ValidateVercelCredentialsRequest,
  type VercelProjectPort,
  type VercelProjectRecord,
} from "./vercel-project-port.js";

export class FakeVercelProjectAdapter implements VercelProjectPort {
  private nextProjectId = 100;

  validateCredentials(request: ValidateVercelCredentialsRequest): Promise<void> {
    if (request.teamId.trim().length === 0) {
      return Promise.reject(new VercelProjectError("Vercel team ID is required"));
    }

    return Promise.resolve();
  }

  createProject(request: CreateVercelProjectRequest): Promise<VercelProjectRecord> {
    const name = request.name.trim();
    if (name.length === 0) {
      return Promise.reject(new VercelProjectError("Vercel project name is required"));
    }

    const projectId = `prj_fake_${String(++this.nextProjectId)}`;
    return Promise.resolve({
      projectId,
      projectName: name,
      projectUrl: `https://vercel.com/fake-team/${name}`,
    });
  }
}
