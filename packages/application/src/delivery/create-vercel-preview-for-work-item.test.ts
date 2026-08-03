import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubPullRequestAdapter } from "@arise/integration-github";
import { FakeVercelPreviewAdapter } from "@arise/integration-vercel";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import { createVercelPreviewForWorkItem } from "./create-vercel-preview-for-work-item.js";
import { InMemoryDeploymentStore } from "./in-memory-deployment-store.js";
import { InMemoryPullRequestStore } from "./in-memory-pull-request-store.js";
import { openPullRequestForWorkItem } from "./open-pull-request-for-work-item.js";
import { readVercelDeployment } from "./read-vercel-deployment.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_vercel_preview",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const githubFixture = {
  installationId: "install_123",
  owner: "PgC-git",
  name: "arise",
  externalId: "987654321",
  fullName: "PgC-git/arise",
  defaultBranch: "main",
  htmlUrl: "https://github.com/PgC-git/arise",
  private: true,
};

async function seedDeliveryScenario(): Promise<{
  workItemId: string;
  repositoryId: string;
  workItemStore: InMemoryWorkItemStore;
  repositoryStore: InMemoryRepositoryStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const repositoryStore = new InMemoryRepositoryStore();
  const githubPort = new FakeGitHubAdapter([githubFixture]);

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      title: "Improve membership onboarding",
      type: "feature",
      riskLevel: "high",
      ownerId: "user_owner",
      problemStatement: "Membership onboarding is fragmented across modules.",
      targetUser: "Platform engineer",
      desiredBehavior: "Onboarding is orchestrated through one workflow.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A new member account",
          when: "They start onboarding",
          then: "The workflow completes in one path",
        },
      ],
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  const repository = await connectRepositoryForProject(
    {
      tenantContext,
      projectId: project.id,
      installationId: "install_123",
      owner: "PgC-git",
      name: "arise",
    },
    projectStore,
    repositoryStore,
    githubPort,
    operationContext,
  );

  return {
    workItemId: workItem.id,
    repositoryId: repository.id,
    workItemStore,
    repositoryStore,
  };
}

describe("createVercelPreviewForWorkItem", () => {
  it("creates a tenant-scoped Vercel preview deployment", async () => {
    const seeded = await seedDeliveryScenario();
    const deploymentStore = new InMemoryDeploymentStore();
    const vercelPreviewPort = new FakeVercelPreviewAdapter();

    const result = await createVercelPreviewForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        vercelProjectId: "arise",
        gitBranch: "feature/onboarding",
        gitCommitSha: "abc123",
        idempotencyKey: "preview_key_1",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    expect(result.deployment.environment).toBe("preview");
    expect(result.deployment.previewUrl).toContain("vercel.app");
    expect(result.idempotentReplay).toBe(false);
  });
});

describe("readVercelDeployment", () => {
  it("records provider failure when an agent claims success", async () => {
    const seeded = await seedDeliveryScenario();
    const deploymentStore = new InMemoryDeploymentStore();
    const vercelPreviewPort = new FakeVercelPreviewAdapter();

    const created = await createVercelPreviewForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        vercelProjectId: "arise",
        gitBranch: "feature/onboarding",
        gitCommitSha: "abc123",
        idempotencyKey: "preview_key_2",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    vercelPreviewPort.updateDeploymentStatus("arise", created.deployment.externalId, "error");

    const result = await readVercelDeployment(
      {
        tenantContext,
        deploymentId: created.deployment.id,
        vercelProjectId: "arise",
        agentClaimedSuccess: true,
      },
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    expect(result.providerEvidence.providerEvidenceWins).toBe(true);
    expect(result.status).toBe("error");
    expect(result.readiness.ready).toBe(false);
  });

  it("marks preview deployments ready from provider evidence", async () => {
    const seeded = await seedDeliveryScenario();
    const deploymentStore = new InMemoryDeploymentStore();
    const vercelPreviewPort = new FakeVercelPreviewAdapter();

    const created = await createVercelPreviewForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        vercelProjectId: "arise",
        gitBranch: "feature/onboarding",
        gitCommitSha: "abc123",
        idempotencyKey: "preview_key_3",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    vercelPreviewPort.updateDeploymentStatus("arise", created.deployment.externalId, "ready");

    const result = await readVercelDeployment(
      {
        tenantContext,
        deploymentId: created.deployment.id,
        vercelProjectId: "arise",
      },
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    expect(result.readiness.ready).toBe(true);
  });

  it("supports preview creation after opening a pull request", async () => {
    const seeded = await seedDeliveryScenario();
    const pullRequestStore = new InMemoryPullRequestStore();
    const deploymentStore = new InMemoryDeploymentStore();
    const githubPullRequestPort = new FakeGitHubPullRequestAdapter();
    const vercelPreviewPort = new FakeVercelPreviewAdapter();

    const pullRequest = await openPullRequestForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        headBranch: "feature/onboarding",
        baseBranch: "main",
        title: "Improve membership onboarding",
        body: "Preview delivery path.",
        idempotencyKey: "pr_key_preview",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      pullRequestStore,
      githubPullRequestPort,
      operationContext,
    );

    const preview = await createVercelPreviewForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        vercelProjectId: "arise",
        gitBranch: "feature/onboarding",
        gitCommitSha: "abc123",
        idempotencyKey: "preview_key_4",
        pullRequestId: pullRequest.pullRequest.id,
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      deploymentStore,
      vercelPreviewPort,
      operationContext,
    );

    expect(preview.deployment.pullRequestId).toBe(pullRequest.pullRequest.id);
  });

  it("blocks deployment reads outside tenant scope", async () => {
    const deploymentStore = new InMemoryDeploymentStore();
    const vercelPreviewPort = new FakeVercelPreviewAdapter();

    await expect(
      readVercelDeployment(
        {
          tenantContext,
          deploymentId: "missing",
          vercelProjectId: "arise",
        },
        deploymentStore,
        vercelPreviewPort,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
