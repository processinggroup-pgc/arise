import type { AgentRun } from "./agent-run.js";

export class AgentRunLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRunLifecycleError";
  }
}

export function startAgentRun(run: AgentRun): AgentRun {
  if (run.status !== "pending") {
    throw new AgentRunLifecycleError("Only pending agent runs can be started");
  }

  return {
    ...run,
    status: "running",
  };
}

export function cancelAgentRun(run: AgentRun): AgentRun {
  if (run.status !== "pending" && run.status !== "running") {
    throw new AgentRunLifecycleError("Only pending or running agent runs can be cancelled");
  }

  return {
    ...run,
    status: "cancelled",
  };
}

export function failAgentRun(run: AgentRun): AgentRun {
  if (run.status !== "pending" && run.status !== "running") {
    throw new AgentRunLifecycleError("Only pending or running agent runs can fail");
  }

  return {
    ...run,
    status: "failed",
  };
}

export function resumeAgentRun(run: AgentRun): AgentRun {
  if (run.status !== "failed") {
    throw new AgentRunLifecycleError("Only failed agent runs can be resumed");
  }

  return {
    ...run,
    status: "running",
  };
}

export function assertAgentRunAcceptsToolActions(run: AgentRun): void {
  if (run.status === "cancelled") {
    throw new AgentRunLifecycleError("Cancelled agent runs cannot authorize tool actions");
  }

  if (run.status === "completed") {
    throw new AgentRunLifecycleError("Completed agent runs cannot authorize tool actions");
  }

  if (run.status === "failed") {
    throw new AgentRunLifecycleError("Failed agent runs cannot authorize tool actions until resumed");
  }
}

export function isAgentRunTerminal(run: AgentRun): boolean {
  return run.status === "completed" || run.status === "cancelled";
}
