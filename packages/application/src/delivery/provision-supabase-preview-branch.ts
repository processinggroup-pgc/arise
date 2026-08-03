import {
  createSupabasePreviewBranch,
  mapSupabaseBranchStatus,
  requiresSupabasePreviewBranch,
  type SupabasePreviewBranch,
  type TenantContext,
} from "@arise/domain";
import type { SupabasePreviewPort } from "@arise/integration-supabase";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { assertRepositoryLinkedToWorkItemProject } from "../agent-runtime/agent-run-scope.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { SupabasePreviewBranchStore } from "./database-migration-store.js";

export interface ProvisionSupabasePreviewBranchCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  supabaseProjectRef: string;
  gitBranch: string;
  changedPaths: string[];
  idempotencyKey: string;
}

export interface ProvisionSupabasePreviewBranchResult {
  previewBranch: SupabasePreviewBranch;
  idempotentReplay: boolean;
  previewRequired: boolean;
}

export async function provisionSupabasePreviewBranch(
  command: ProvisionSupabasePreviewBranchCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  previewBranchStore: SupabasePreviewBranchStore,
  supabasePreviewPort: SupabasePreviewPort,
  operationContext: IdentityOperationContext,
): Promise<ProvisionSupabasePreviewBranchResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const previewRequired = requiresSupabasePreviewBranch({
    changedPaths: command.changedPaths,
  });
  if (!previewRequired) {
    throw new AgentRunScopeError(
      "Supabase preview branch is only required for database-changing work items",
    );
  }

  const providerRecord = await supabasePreviewPort.createPreviewBranch({
    projectRef: command.supabaseProjectRef.trim(),
    gitBranch: command.gitBranch,
    idempotencyKey: command.idempotencyKey,
  });

  const existing = await previewBranchStore.findSupabasePreviewBranchByExternalId(
    command.tenantContext.organizationId,
    providerRecord.externalId,
  );
  if (existing !== undefined) {
    return {
      previewBranch: existing,
      idempotentReplay: true,
      previewRequired,
    };
  }

  const previewBranch = createSupabasePreviewBranch(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      externalId: providerRecord.externalId,
      branchName: providerRecord.branchName,
      projectRef: providerRecord.projectRef,
      status: mapSupabaseBranchStatus(providerRecord.status),
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await previewBranchStore.saveSupabasePreviewBranch(previewBranch);

  return {
    previewBranch,
    idempotentReplay: false,
    previewRequired,
  };
}
