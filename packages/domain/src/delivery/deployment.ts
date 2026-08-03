export const DEPLOYMENT_PROVIDERS = ["vercel"] as const;
export type DeploymentProvider = (typeof DEPLOYMENT_PROVIDERS)[number];

export const DEPLOYMENT_ENVIRONMENTS = ["preview", "production"] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

export const DEPLOYMENT_STATUSES = ["queued", "building", "ready", "error", "cancelled"] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export interface Deployment {
  id: string;
  organizationId: string;
  repositoryId: string;
  workItemId: string;
  pullRequestId?: string;
  provider: DeploymentProvider;
  externalId: string;
  environment: DeploymentEnvironment;
  previewUrl: string;
  status: DeploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentReadinessEvaluation {
  ready: boolean;
  blockers: string[];
}

export interface ProviderEvidenceComparison {
  recordedStatus: DeploymentStatus;
  providerEvidenceWins: boolean;
  message: string;
}

export interface CreateDeploymentInput {
  organizationId: string;
  repositoryId: string;
  workItemId: string;
  pullRequestId?: string;
  provider: string;
  externalId: string;
  environment: string;
  previewUrl: string;
  status?: DeploymentStatus;
}

export interface CreateDeploymentMetadata {
  id: string;
  createdAt: Date;
}

function assertDeploymentProvider(provider: string): DeploymentProvider {
  if (!(DEPLOYMENT_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error("Deployment provider is invalid");
  }

  return provider as DeploymentProvider;
}

function assertDeploymentEnvironment(environment: string): DeploymentEnvironment {
  if (!(DEPLOYMENT_ENVIRONMENTS as readonly string[]).includes(environment)) {
    throw new Error("Deployment environment is invalid");
  }

  return environment as DeploymentEnvironment;
}

function assertDeploymentStatus(status: string): DeploymentStatus {
  if (!(DEPLOYMENT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Deployment status is invalid");
  }

  return status as DeploymentStatus;
}

export function createDeployment(
  input: CreateDeploymentInput,
  metadata: CreateDeploymentMetadata,
): Deployment {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const workItemId = input.workItemId.trim();
  const externalId = input.externalId.trim();
  const previewUrl = input.previewUrl.trim();

  if (
    organizationId.length === 0 ||
    repositoryId.length === 0 ||
    workItemId.length === 0 ||
    externalId.length === 0
  ) {
    throw new Error("Deployment identifiers are required");
  }

  if (previewUrl.length === 0) {
    throw new Error("Deployment preview url is required");
  }

  const deployment: Deployment = {
    id: metadata.id,
    organizationId,
    repositoryId,
    workItemId,
    provider: assertDeploymentProvider(input.provider.trim()),
    externalId,
    environment: assertDeploymentEnvironment(input.environment.trim()),
    previewUrl,
    status: assertDeploymentStatus(input.status ?? "queued"),
    createdAt: metadata.createdAt,
    updatedAt: metadata.createdAt,
  };

  if (input.pullRequestId !== undefined) {
    const pullRequestId = input.pullRequestId.trim();
    if (pullRequestId.length === 0) {
      throw new Error("Deployment pull request id is invalid");
    }

    deployment.pullRequestId = pullRequestId;
  }

  return deployment;
}

export function updateDeploymentStatus(
  deployment: Deployment,
  status: DeploymentStatus,
  updatedAt: Date,
): Deployment {
  return {
    ...deployment,
    status: assertDeploymentStatus(status),
    updatedAt,
  };
}

export function evaluateDeploymentReadiness(input: {
  status: DeploymentStatus;
  previewUrl: string;
}): DeploymentReadinessEvaluation {
  const blockers: string[] = [];

  if (input.status === "queued" || input.status === "building") {
    blockers.push("Deployment is still in progress");
  }

  if (input.status === "error" || input.status === "cancelled") {
    blockers.push(`Deployment ended with status ${input.status}`);
  }

  if (input.previewUrl.trim().length === 0) {
    blockers.push("Deployment preview url is missing");
  }

  return {
    ready: blockers.length === 0 && input.status === "ready",
    blockers,
  };
}

export function assertDeploymentMatchesProviderEvidence(input: {
  providerStatus: DeploymentStatus;
  agentClaimedSuccess?: boolean;
}): ProviderEvidenceComparison {
  if (input.agentClaimedSuccess === true && input.providerStatus !== "ready") {
    return {
      recordedStatus: input.providerStatus,
      providerEvidenceWins: true,
      message: "Provider deployment evidence overrides agent success claim",
    };
  }

  return {
    recordedStatus: input.providerStatus,
    providerEvidenceWins: false,
    message: "Provider deployment evidence recorded",
  };
}

export function mapVercelDeploymentStatus(status: string): DeploymentStatus {
  switch (status) {
    case "queued":
    case "building":
    case "ready":
    case "error":
    case "cancelled":
      return status;
    default:
      throw new Error("Vercel deployment status is invalid");
  }
}
