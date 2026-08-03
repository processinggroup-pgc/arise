import {
  SandboxProvisionError,
  type SandboxPort,
  type SandboxProvisionRequest,
  type SandboxProvisionResult,
} from "./sandbox-port.js";

interface FakeSandboxRecord {
  sandboxSessionId: string;
  workspacePath: string;
  branch: string;
  repositoryFullName: string;
  limits: SandboxProvisionRequest["limits"];
  terminated: boolean;
}

function buildSandboxSessionId(sessionId: string): string {
  return `fake_sandbox_${sessionId}`;
}

function buildWorkspacePath(repositoryFullName: string, branch: string): string {
  const normalizedRepo = repositoryFullName.trim().replace(/\\/gu, "/");
  const normalizedBranch = branch.trim().replace(/[^a-zA-Z0-9/_-]/gu, "-");
  return `/workspace/${normalizedRepo}/${normalizedBranch}`;
}

export class FakeSandboxAdapter implements SandboxPort {
  private readonly sessions = new Map<string, FakeSandboxRecord>();

  provision(request: SandboxProvisionRequest): Promise<SandboxProvisionResult> {
    const sessionId = request.sessionId.trim();
    const organizationId = request.organizationId.trim();
    const repositoryFullName = request.repositoryFullName.trim();
    const branch = request.branch.trim();

    if (sessionId.length === 0 || organizationId.length === 0) {
      return Promise.reject(new SandboxProvisionError("Sandbox session identifiers are required"));
    }

    if (repositoryFullName.length === 0 || branch.length === 0) {
      return Promise.reject(new SandboxProvisionError("Sandbox repository branch is required"));
    }

    if (request.limits.maxDurationMs < 1 || request.limits.maxMemoryMb < 1 || request.limits.maxCpuMillis < 1) {
      return Promise.reject(new SandboxProvisionError("Sandbox limits are invalid"));
    }

    if (request.limits.networkEgressAllowed) {
      return Promise.reject(new SandboxProvisionError("Routine sandboxes cannot allow network egress"));
    }

    const sandboxSessionId = buildSandboxSessionId(sessionId);
    const workspacePath = buildWorkspacePath(repositoryFullName, branch);

    this.sessions.set(sandboxSessionId, {
      sandboxSessionId,
      workspacePath,
      branch,
      repositoryFullName,
      limits: request.limits,
      terminated: false,
    });

    return Promise.resolve({
      sandboxSessionId,
      workspacePath,
      productionSecretsMounted: false,
    });
  }

  terminate(sandboxSessionId: string): Promise<void> {
    const record = this.sessions.get(sandboxSessionId);
    if (record === undefined) {
      return Promise.reject(new SandboxProvisionError("Sandbox session was not found"));
    }

    record.terminated = true;
    return Promise.resolve();
  }

  getSession(sandboxSessionId: string): FakeSandboxRecord | undefined {
    const record = this.sessions.get(sandboxSessionId);
    if (record === undefined || record.terminated) {
      return undefined;
    }

    return record;
  }
}
