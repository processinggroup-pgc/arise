import { createPullRequest, type PullRequest, type TenantContext } from "@arise/domain";
import type { GitHubPullRequestPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { assertRepositoryLinkedToWorkItemProject } from "../agent-runtime/agent-run-scope.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import type { PullRequestStore } from "./pull-request-store.js";

export interface OpenPullRequestForWorkItemCommand {
  tenantContext: TenantContext;
  workItemId: string;
  repositoryId: string;
  headBranch: string;
  baseBranch: string;
  title: string;
  body: string;
  idempotencyKey: string;
}

export interface OpenPullRequestForWorkItemResult {
  pullRequest: PullRequest;
  idempotentReplay: boolean;
}

export async function openPullRequestForWorkItem(
  command: OpenPullRequestForWorkItemCommand,
  workItemStore: WorkItemStore,
  repositoryStore: RepositoryStore,
  pullRequestStore: PullRequestStore,
  githubPullRequestPort: GitHubPullRequestPort,
  operationContext: IdentityOperationContext,
): Promise<OpenPullRequestForWorkItemResult> {
  await assertRepositoryLinkedToWorkItemProject(
    workItemStore,
    repositoryStore,
    command.workItemId,
    command.repositoryId,
    command.tenantContext,
  );

  const repository = await repositoryStore.findRepositoryById(command.repositoryId);
  if (repository === undefined) {
    throw new AgentRunScopeError("Repository was not found");
  }

  const [owner, name] = repository.fullName.split("/");
  if (owner === undefined || name === undefined || owner.length === 0 || name.length === 0) {
    throw new AgentRunScopeError("Repository full name is invalid");
  }

  const providerRecord = await githubPullRequestPort.openPullRequest({
    installationId: repository.installationId,
    owner,
    name,
    headBranch: command.headBranch,
    baseBranch: command.baseBranch,
    title: command.title,
    body: command.body,
    idempotencyKey: command.idempotencyKey,
  });

  const existing = await pullRequestStore.findPullRequestByExternalId(
    command.tenantContext.organizationId,
    providerRecord.externalId,
  );
  if (existing !== undefined) {
    return {
      pullRequest: existing,
      idempotentReplay: true,
    };
  }

  const pullRequest = createPullRequest(
    {
      organizationId: command.tenantContext.organizationId,
      repositoryId: command.repositoryId,
      workItemId: command.workItemId,
      externalId: providerRecord.externalId,
      number: providerRecord.number,
      url: providerRecord.url,
      headBranch: providerRecord.headBranch,
      baseBranch: providerRecord.baseBranch,
      status: providerRecord.status,
    },
    {
      id: operationContext.createId(),
      createdAt: operationContext.now(),
    },
  );

  await pullRequestStore.savePullRequest(pullRequest);

  return {
    pullRequest,
    idempotentReplay: false,
  };
}
