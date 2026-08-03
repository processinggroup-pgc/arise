import {
  createDeployment,
  mapVercelDeploymentStatus,
  type Deployment,
  type TenantContext,
} from "@arise/domain";
import type { VercelPreviewPort } from "@arise/integration-vercel";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { assertRepositoryLinkedToWorkItemProject } from "../agent-runtime/agent-run-scope.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { DeploymentStore } from "./deployment-store.js";

export interface CreateVercelPreviewForWorkItemCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  vercelProjectId: string;
  gitBranch: string;
  gitCommitSha: string;
  idempotencyKey: string;
  pullRequestId?: string;
}

export interface CreateVercelPreviewForWorkItemResult {
  deployment: Deployment;
  idempotentReplay: boolean;
}

export async function createVercelPreviewForWorkItem(
  command: CreateVercelPreviewForWorkItemCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  deploymentStore: DeploymentStore,
  vercelPreviewPort: VercelPreviewPort,
  operationContext: IdentityOperationContext,
): Promise<CreateVercelPreviewForWorkItemResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const providerRecord = await vercelPreviewPort.createPreview({
    projectId: command.vercelProjectId.trim(),
    gitBranch: command.gitBranch,
    gitCommitSha: command.gitCommitSha,
    idempotencyKey: command.idempotencyKey,
  });

  const existing = await deploymentStore.findDeploymentByExternalId(
    command.tenantContext.organizationId,
    "vercel",
    providerRecord.externalId,
  );
  if (existing !== undefined) {
    return {
      deployment: existing,
      idempotentReplay: true,
    };
  }

  const deployment = createDeployment(
    {
      organizationId: command.tenantContext.organizationId,
      repositoryId: command.repositoryId,
      workItemId: command.workItemId,
      ...(command.pullRequestId === undefined ? {} : { pullRequestId: command.pullRequestId }),
      provider: "vercel",
      externalId: providerRecord.externalId,
      environment: "preview",
      previewUrl: providerRecord.previewUrl,
      status: mapVercelDeploymentStatus(providerRecord.status),
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await deploymentStore.saveDeployment(deployment);

  return {
    deployment,
    idempotentReplay: false,
  };
}
