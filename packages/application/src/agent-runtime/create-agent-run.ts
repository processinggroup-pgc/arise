import {
  createAgentRun,
  createAgentRunInputContract,
  resolveRegisteredModel,
  type AgentRun,
  type AgentRunInputContract,
  type CreateAgentRunInputContractInput,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { AgentRunStore } from "./agent-run-store.js";
import type { ModelRegistryStore } from "./model-registry-store.js";

export interface CreateAgentRunCommand {
  tenantContext: TenantContext;
  workItemId: string;
  agentType: string;
  registeredModelId: string;
  inputContract: Omit<CreateAgentRunInputContractInput, "workItemId">;
}

export interface CreateAgentRunResult {
  run: AgentRun;
  inputContract: AgentRunInputContract;
}

export class AgentRunScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRunScopeError";
  }
}

export class RegisteredModelNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegisteredModelNotFoundError";
  }
}

async function assertWorkItemInTenantScope(
  workItemStore: WorkItemStore,
  workItemId: string,
  tenantContext: TenantContext,
): Promise<void> {
  const workItem = await workItemStore.findWorkItemVersionById(workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }
}

export async function createAgentRunForWorkItem(
  command: CreateAgentRunCommand,
  workItemStore: WorkItemStore,
  modelRegistryStore: ModelRegistryStore,
  agentRunStore: AgentRunStore,
  operationContext: IdentityOperationContext,
): Promise<CreateAgentRunResult> {
  await assertWorkItemInTenantScope(
    workItemStore,
    command.workItemId,
    command.tenantContext,
  );

  const registeredModel = await modelRegistryStore.findRegisteredModelById(
    command.registeredModelId,
  );
  if (registeredModel === undefined) {
    throw new RegisteredModelNotFoundError("Registered model was not found");
  }

  if (
    registeredModel.organizationId !== null &&
    registeredModel.organizationId !== command.tenantContext.organizationId
  ) {
    throw new AgentRunScopeError("Registered model is outside the tenant scope");
  }

  const availableModels = await modelRegistryStore.listRegisteredModels(
    command.tenantContext.organizationId,
  );
  resolveRegisteredModel(availableModels, {
    provider: registeredModel.provider,
    name: registeredModel.name,
    version: registeredModel.version,
    organizationId: command.tenantContext.organizationId,
  });

  const inputContract = createAgentRunInputContract({
    ...command.inputContract,
    workItemId: command.workItemId,
  });

  if (inputContract.workItemId !== command.workItemId) {
    throw new AgentRunScopeError("Input contract work item mismatch");
  }

  const run = createAgentRun(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      agentType: command.agentType,
      registeredModelId: registeredModel.id,
      modelProvider: registeredModel.provider,
      modelName: registeredModel.name,
      modelVersion: registeredModel.version,
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await agentRunStore.saveAgentRun(run);

  return {
    run,
    inputContract,
  };
}
