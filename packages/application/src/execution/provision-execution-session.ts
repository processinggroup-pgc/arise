import {
  createExecutionSession,
  failExecutionSession,
  markExecutionSessionReady,
  PLATFORM_EXECUTION_SESSION_LIMITS,
  startExecutionSessionProvisioning,
  type ExecutionSession,
  type ExecutionSessionLimits,
  type TenantContext,
} from "@arise/domain";
import type { SandboxPort } from "@arise/integration-sandbox";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { ExecutionSessionStore } from "./execution-session-store.js";

export interface ProvisionExecutionSessionCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  branch: string;
  limits?: ExecutionSessionLimits;
}

export class ExecutionSessionScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionSessionScopeError";
  }
}

export class ExecutionSessionProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionSessionProvisionError";
  }
}

async function assertRepositoryLinkedToWorkItemProject(
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  workItemId: string,
  repositoryId: string,
  tenantContext: TenantContext,
): Promise<{ repositoryFullName: string }> {
  const workItem = await workItemStore.findWorkItemVersionById(workItemId);
  if (workItem === undefined) {
    throw new ExecutionSessionScopeError("Work item was not found");
  }

  if (workItem.organizationId !== tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Work item is outside the tenant scope");
  }

  const repository = await repositoryStore.findRepositoryById(repositoryId);
  if (repository === undefined) {
    throw new ExecutionSessionScopeError("Repository was not found");
  }

  if (repository.organizationId !== tenantContext.organizationId) {
    throw new ExecutionSessionScopeError("Repository is outside the tenant scope");
  }

  if (repository.projectId !== workItem.projectId) {
    throw new ExecutionSessionScopeError("Repository is not linked to the work item project");
  }

  return { repositoryFullName: repository.fullName };
}

export async function provisionExecutionSession(
  command: ProvisionExecutionSessionCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  executionSessionStore: ExecutionSessionStore,
  sandboxPort: SandboxPort,
  operationContext: IdentityOperationContext,
): Promise<ExecutionSession> {
  const { repositoryFullName } = await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const limits = command.limits ?? PLATFORM_EXECUTION_SESSION_LIMITS;
  const requested = createExecutionSession(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      repositoryId: command.repositoryId,
      sandboxProvider: "fake",
      branch: command.branch,
      limits,
    },
    {
      id: operationContext.createId(),
      startedAt: operationContext.now(),
    },
  );

  const provisioning = startExecutionSessionProvisioning(requested);
  await executionSessionStore.saveExecutionSession(provisioning);

  try {
    const provisioned = await sandboxPort.provision({
      sessionId: provisioning.id,
      organizationId: command.tenantContext.organizationId,
      repositoryFullName,
      branch: command.branch,
      limits,
    });

    const ready = markExecutionSessionReady(
      provisioning,
      provisioned.sandboxSessionId,
      provisioned.workspacePath,
    );
    await executionSessionStore.saveExecutionSession(ready);
    return ready;
  } catch (error) {
    const failed = failExecutionSession(provisioning, operationContext.now());
    await executionSessionStore.saveExecutionSession(failed);

    if (error instanceof ExecutionSessionProvisionError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ExecutionSessionProvisionError(error.message);
    }

    throw error;
  }
}
