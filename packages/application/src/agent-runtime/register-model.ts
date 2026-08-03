import {
  createRegisteredModel,
  type RegisteredModel,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { ModelRegistryStore } from "./model-registry-store.js";

export interface RegisterModelCommand {
  tenantContext: TenantContext;
  provider: string;
  name: string;
  version: string;
  capabilities: string[];
  status: string;
  maxTokensPerRun?: number;
  maxCostUsdPerRun?: number;
}

export class ModelRegistryScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelRegistryScopeError";
  }
}

export async function registerModelForOrganization(
  command: RegisterModelCommand,
  store: ModelRegistryStore,
  operationContext: IdentityOperationContext,
): Promise<RegisteredModel> {
  const model = createRegisteredModel(
    {
      organizationId: command.tenantContext.organizationId,
      provider: command.provider,
      name: command.name,
      version: command.version,
      capabilities: command.capabilities,
      status: command.status,
      ...(command.maxTokensPerRun === undefined
        ? {}
        : { maxTokensPerRun: command.maxTokensPerRun }),
      ...(command.maxCostUsdPerRun === undefined
        ? {}
        : { maxCostUsdPerRun: command.maxCostUsdPerRun }),
    },
    { id: operationContext.createId() },
  );

  if (model.organizationId !== command.tenantContext.organizationId) {
    throw new ModelRegistryScopeError("Registered model is outside the tenant scope");
  }

  await store.saveRegisteredModel(model);
  return model;
}

export async function registerPlatformModel(
  command: Omit<RegisterModelCommand, "tenantContext">,
  store: ModelRegistryStore,
  operationContext: IdentityOperationContext,
): Promise<RegisteredModel> {
  const model = createRegisteredModel(
    {
      provider: command.provider,
      name: command.name,
      version: command.version,
      capabilities: command.capabilities,
      status: command.status,
      ...(command.maxTokensPerRun === undefined
        ? {}
        : { maxTokensPerRun: command.maxTokensPerRun }),
      ...(command.maxCostUsdPerRun === undefined
        ? {}
        : { maxCostUsdPerRun: command.maxCostUsdPerRun }),
    },
    { id: operationContext.createId() },
  );

  await store.saveRegisteredModel(model);
  return model;
}
