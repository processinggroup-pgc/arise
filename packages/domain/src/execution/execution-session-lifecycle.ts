import type { ExecutionSession } from "./execution-session.js";

export class ExecutionSessionLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionSessionLifecycleError";
  }
}

export function startExecutionSessionProvisioning(session: ExecutionSession): ExecutionSession {
  if (session.state !== "requested") {
    throw new ExecutionSessionLifecycleError(
      "Only requested execution sessions can be provisioned",
    );
  }

  return {
    ...session,
    state: "provisioning",
  };
}

export function markExecutionSessionReady(
  session: ExecutionSession,
  sandboxSessionId: string,
  workspacePath: string,
): ExecutionSession {
  if (session.state !== "provisioning") {
    throw new ExecutionSessionLifecycleError(
      "Only provisioning execution sessions can become ready",
    );
  }

  const normalizedSandboxSessionId = sandboxSessionId.trim();
  const normalizedWorkspacePath = workspacePath.trim();

  if (normalizedSandboxSessionId.length === 0 || normalizedWorkspacePath.length === 0) {
    throw new ExecutionSessionLifecycleError("Sandbox session details are required");
  }

  return {
    ...session,
    sandboxSessionId: normalizedSandboxSessionId,
    workspacePath: normalizedWorkspacePath,
    state: "ready",
  };
}

export function failExecutionSession(session: ExecutionSession, endedAt: Date): ExecutionSession {
  if (session.state !== "requested" && session.state !== "provisioning") {
    throw new ExecutionSessionLifecycleError(
      "Execution session cannot fail from the current state",
    );
  }

  return {
    ...session,
    state: "failed",
    endedAt,
  };
}

export function terminateExecutionSession(
  session: ExecutionSession,
  endedAt: Date,
): ExecutionSession {
  if (
    session.state === "completed" ||
    session.state === "failed" ||
    session.state === "cancelled"
  ) {
    throw new ExecutionSessionLifecycleError("Execution session is already terminal");
  }

  return {
    ...session,
    state: "cancelled",
    endedAt,
  };
}

export function assertExecutionSessionAcceptsToolActions(session: ExecutionSession): void {
  if (session.state !== "ready" && session.state !== "running") {
    throw new ExecutionSessionLifecycleError("Execution session is not ready for tool actions");
  }

  if (session.sandboxSessionId.trim().length === 0) {
    throw new ExecutionSessionLifecycleError("Execution session sandbox is not provisioned");
  }
}
