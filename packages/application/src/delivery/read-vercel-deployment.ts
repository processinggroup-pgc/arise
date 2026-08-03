import {
  assertDeploymentMatchesProviderEvidence,
  evaluateDeploymentReadiness,
  mapVercelDeploymentStatus,
  updateDeploymentStatus,
  type DeploymentReadinessEvaluation,
  type ProviderEvidenceComparison,
  type TenantContext,
} from "@arise/domain";
import type { VercelPreviewPort } from "@arise/integration-vercel";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { DeploymentStore } from "./deployment-store.js";

export interface ReadVercelDeploymentCommand {
  tenantContext: TenantContext;
  deploymentId: string;
  vercelProjectId: string;
  agentClaimedSuccess?: boolean;
}

export interface ReadVercelDeploymentResult {
  readiness: DeploymentReadinessEvaluation;
  providerEvidence: ProviderEvidenceComparison;
  deploymentId: string;
  status: string;
  previewUrl: string;
}

export async function readVercelDeployment(
  command: ReadVercelDeploymentCommand,
  deploymentStore: DeploymentStore,
  vercelPreviewPort: VercelPreviewPort,
  operationContext: IdentityOperationContext,
): Promise<ReadVercelDeploymentResult> {
  const deployment = await deploymentStore.findDeploymentById(command.deploymentId);
  if (deployment === undefined) {
    throw new AgentRunScopeError("Deployment was not found");
  }

  if (deployment.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Deployment is outside the tenant scope");
  }

  const providerRecord = await vercelPreviewPort.readDeployment({
    projectId: command.vercelProjectId.trim(),
    deploymentExternalId: deployment.externalId,
  });

  const providerStatus = mapVercelDeploymentStatus(providerRecord.status);
  const providerEvidence = assertDeploymentMatchesProviderEvidence({
    providerStatus,
    ...(command.agentClaimedSuccess === undefined
      ? {}
      : { agentClaimedSuccess: command.agentClaimedSuccess }),
  });

  const updatedDeployment = updateDeploymentStatus(
    {
      ...deployment,
      previewUrl: providerRecord.previewUrl,
    },
    providerEvidence.recordedStatus,
    operationContext.now(),
  );
  await deploymentStore.saveDeployment(updatedDeployment);

  const readiness = evaluateDeploymentReadiness({
    status: providerEvidence.recordedStatus,
    previewUrl: providerRecord.previewUrl,
  });

  return {
    readiness,
    providerEvidence,
    deploymentId: updatedDeployment.id,
    status: providerEvidence.recordedStatus,
    previewUrl: providerRecord.previewUrl,
  };
}
