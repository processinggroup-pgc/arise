export interface SandboxSessionLimits {
  maxDurationMs: number;
  maxMemoryMb: number;
  maxCpuMillis: number;
  networkEgressAllowed: boolean;
}

export interface SandboxProvisionRequest {
  sessionId: string;
  organizationId: string;
  repositoryFullName: string;
  branch: string;
  limits: SandboxSessionLimits;
}

export interface SandboxProvisionResult {
  sandboxSessionId: string;
  workspacePath: string;
  productionSecretsMounted: false;
}

export interface SandboxPort {
  provision(request: SandboxProvisionRequest): Promise<SandboxProvisionResult>;
  terminate(sandboxSessionId: string): Promise<void>;
}

export class SandboxProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxProvisionError";
  }
}
