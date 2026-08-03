import type { ExecutionSession } from "../execution/execution-session.js";
import { ExecutionSessionLifecycleError } from "../execution/execution-session-lifecycle.js";

export const SUSPENDABLE_EXECUTION_SESSION_STATES = [
  "provisioning",
  "ready",
  "running",
  "validating",
] as const;

export type SuspendableExecutionSessionState =
  (typeof SUSPENDABLE_EXECUTION_SESSION_STATES)[number];

export function canSuspendExecutionSession(session: ExecutionSession): boolean {
  return (SUSPENDABLE_EXECUTION_SESSION_STATES as readonly string[]).includes(session.state);
}

export function quarantineExecutionSessionForIncident(
  session: ExecutionSession,
  endedAt: Date,
): ExecutionSession {
  if (!canSuspendExecutionSession(session)) {
    throw new ExecutionSessionLifecycleError("Execution session cannot be suspended for incident containment");
  }

  return {
    ...session,
    state: "quarantined",
    endedAt,
  };
}
