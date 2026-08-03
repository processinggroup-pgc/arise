export const EXECUTION_SESSION_STATES = [
  "requested",
  "provisioning",
  "ready",
  "running",
  "validating",
  "completed",
  "failed",
  "cancelled",
  "quarantined",
] as const;

export type ExecutionSessionState = (typeof EXECUTION_SESSION_STATES)[number];

export const SANDBOX_PROVIDERS = ["fake"] as const;
export type SandboxProvider = (typeof SANDBOX_PROVIDERS)[number];

export interface ExecutionSessionLimits {
  maxDurationMs: number;
  maxMemoryMb: number;
  maxCpuMillis: number;
  networkEgressAllowed: boolean;
}

export const PLATFORM_EXECUTION_SESSION_LIMITS: ExecutionSessionLimits = {
  maxDurationMs: 1_800_000,
  maxMemoryMb: 512,
  maxCpuMillis: 60_000,
  networkEgressAllowed: false,
};

export interface ExecutionSession {
  id: string;
  organizationId: string;
  workItemId: string;
  repositoryId: string;
  sandboxProvider: SandboxProvider;
  sandboxSessionId: string;
  workspacePath: string;
  state: ExecutionSessionState;
  limits: ExecutionSessionLimits;
  branch: string;
  startedAt: Date;
  endedAt?: Date;
}

export interface CreateExecutionSessionInput {
  organizationId: string;
  workItemId: string;
  repositoryId: string;
  sandboxProvider: string;
  branch: string;
  limits?: ExecutionSessionLimits;
  sandboxSessionId?: string;
  workspacePath?: string;
  state?: string;
}

export interface CreateExecutionSessionMetadata {
  id: string;
  startedAt: Date;
}

function assertExecutionSessionState(state: string): ExecutionSessionState {
  if (!(EXECUTION_SESSION_STATES as readonly string[]).includes(state)) {
    throw new Error("Execution session state is invalid");
  }

  return state as ExecutionSessionState;
}

function assertSandboxProvider(provider: string): SandboxProvider {
  if (!(SANDBOX_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error("Sandbox provider is invalid");
  }

  return provider as SandboxProvider;
}

function assertExecutionSessionLimits(limits: ExecutionSessionLimits): ExecutionSessionLimits {
  if (limits.maxDurationMs < 1 || limits.maxMemoryMb < 1 || limits.maxCpuMillis < 1) {
    throw new Error("Execution session limits are invalid");
  }

  if (limits.networkEgressAllowed) {
    throw new Error("Routine execution sessions cannot allow network egress");
  }

  return limits;
}

export function createExecutionSession(
  input: CreateExecutionSessionInput,
  metadata: CreateExecutionSessionMetadata,
): ExecutionSession {
  const organizationId = input.organizationId.trim();
  const workItemId = input.workItemId.trim();
  const repositoryId = input.repositoryId.trim();
  const branch = input.branch.trim();
  const sandboxSessionId = input.sandboxSessionId?.trim() ?? "";
  const workspacePath = input.workspacePath?.trim() ?? "";

  if (organizationId.length === 0 || workItemId.length === 0 || repositoryId.length === 0) {
    throw new Error("Execution session identifiers are required");
  }

  if (branch.length === 0) {
    throw new Error("Execution session branch is required");
  }

  const limits = assertExecutionSessionLimits(input.limits ?? PLATFORM_EXECUTION_SESSION_LIMITS);

  return {
    id: metadata.id,
    organizationId,
    workItemId,
    repositoryId,
    sandboxProvider: assertSandboxProvider(input.sandboxProvider),
    sandboxSessionId,
    workspacePath,
    state: assertExecutionSessionState(input.state ?? "requested"),
    limits,
    branch,
    startedAt: metadata.startedAt,
  };
}
