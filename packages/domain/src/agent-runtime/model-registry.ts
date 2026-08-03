export const MODEL_PROVIDERS = ["openai", "anthropic", "cursor"] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export const MODEL_STATUSES = ["active", "deprecated"] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export const MODEL_CAPABILITIES = ["text", "vision", "tool_use"] as const;
export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

export interface RegisteredModel {
  id: string;
  organizationId: string | null;
  provider: ModelProvider;
  name: string;
  version: string;
  capabilities: ModelCapability[];
  status: ModelStatus;
  maxTokensPerRun?: number;
  maxCostUsdPerRun?: number;
}

export interface CreateRegisteredModelInput {
  organizationId?: string;
  provider: string;
  name: string;
  version: string;
  capabilities: string[];
  status: string;
  maxTokensPerRun?: number;
  maxCostUsdPerRun?: number;
}

export interface CreateRegisteredModelMetadata {
  id: string;
}

function assertModelProvider(provider: string): ModelProvider {
  if (!(MODEL_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error("Model provider is invalid");
  }

  return provider as ModelProvider;
}

function assertModelStatus(status: string): ModelStatus {
  if (!(MODEL_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Model status is invalid");
  }

  return status as ModelStatus;
}

function assertModelCapabilities(capabilities: string[]): ModelCapability[] {
  if (capabilities.length === 0) {
    throw new Error("Model capabilities are required");
  }

  const normalized = capabilities.map((capability) => capability.trim()).filter(Boolean);
  const unique = [...new Set(normalized)];

  for (const capability of unique) {
    if (!(MODEL_CAPABILITIES as readonly string[]).includes(capability)) {
      throw new Error("Model capability is invalid");
    }
  }

  return unique as ModelCapability[];
}

export function buildRegisteredModelKey(
  provider: ModelProvider,
  name: string,
  version: string,
): string {
  return `${provider}:${name.trim()}@${version.trim()}`;
}

export function createRegisteredModel(
  input: CreateRegisteredModelInput,
  metadata: CreateRegisteredModelMetadata,
): RegisteredModel {
  const organizationId =
    input.organizationId === undefined ? null : input.organizationId.trim() || null;
  const name = input.name.trim();
  const version = input.version.trim();
  const provider = assertModelProvider(input.provider);
  const status = assertModelStatus(input.status);
  const capabilities = assertModelCapabilities(input.capabilities);

  if (name.length === 0) {
    throw new Error("Model name is required");
  }

  if (version.length === 0) {
    throw new Error("Model version is required");
  }

  if (input.maxTokensPerRun !== undefined && input.maxTokensPerRun < 1) {
    throw new Error("Model max tokens per run must be positive");
  }

  if (input.maxCostUsdPerRun !== undefined && input.maxCostUsdPerRun <= 0) {
    throw new Error("Model max cost per run must be positive");
  }

  return {
    id: metadata.id,
    organizationId,
    provider,
    name,
    version,
    capabilities,
    status,
    ...(input.maxTokensPerRun === undefined ? {} : { maxTokensPerRun: input.maxTokensPerRun }),
    ...(input.maxCostUsdPerRun === undefined ? {} : { maxCostUsdPerRun: input.maxCostUsdPerRun }),
  };
}

export function resolveRegisteredModel(
  models: RegisteredModel[],
  criteria: {
    provider: string;
    name: string;
    version: string;
    organizationId?: string;
  },
): RegisteredModel {
  const provider = assertModelProvider(criteria.provider);
  const name = criteria.name.trim();
  const version = criteria.version.trim();
  const organizationId = criteria.organizationId?.trim();

  const matches = models.filter(
    (model) =>
      model.provider === provider &&
      model.name === name &&
      model.version === version &&
      model.status === "active" &&
      (model.organizationId === null ||
        (organizationId !== undefined && model.organizationId === organizationId)),
  );

  if (matches.length === 0) {
    throw new Error("Registered model was not found");
  }

  const orgSpecific = matches.find((model) => model.organizationId === organizationId);
  if (orgSpecific !== undefined) {
    return orgSpecific;
  }

  const platformDefault = matches.find((model) => model.organizationId === null);
  if (platformDefault !== undefined) {
    return platformDefault;
  }

  throw new Error("Registered model was not found");
}
