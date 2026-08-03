import { describe, expect, it } from "vitest";

import { createPullRequest, createTenantContext } from "@arise/domain";
import { FakeGitHubAdapter, FakeGitHubPullRequestAdapter } from "@arise/integration-github";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { connectRepositoryForProject } from "../repository/connect-repository.js";
import { InMemoryRepositoryStore } from "../repository/in-memory-repository-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import { InMemoryPullRequestStore } from "./in-memory-pull-request-store.js";
import { openPullRequestForWorkItem } from "./open-pull-request-for-work-item.js";
import { readPullRequestChecks } from "./read-pull-request-checks.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_delivery_pr",
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

describe("openPullRequestForWorkItem", () => {
  it("opens a tenant-scoped pull request through the fake GitHub adapter", async () => {
    const seeded = await seedDeliveryScenario();
    const pullRequestStore = new InMemoryPullRequestStore();
    const githubPullRequestPort = new FakeGitHubPullRequestAdapter();

    const result = await openPullRequestForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        headBranch: "feature/onboarding",
        baseBranch: "main",
        title: "Improve membership onboarding",
        body: "Implements onboarding workflow changes.",
        idempotencyKey: "pr_key_1",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      pullRequestStore,
      githubPullRequestPort,
      operationContext,
    );

    expect(result.pullRequest.url).toContain("/pull/");
    expect(result.idempotentReplay).toBe(false);

    const replay = await openPullRequestForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        headBranch: "feature/onboarding",
        baseBranch: "main",
        title: "Improve membership onboarding",
        body: "Implements onboarding workflow changes.",
        idempotencyKey: "pr_key_1",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      pullRequestStore,
      githubPullRequestPort,
      operationContext,
    );

    expect(replay.idempotentReplay).toBe(true);
    expect(replay.pullRequest.id).toBe(result.pullRequest.id);
  });
});

describe("readPullRequestChecks", () => {
  it("reads required GitHub checks and evaluates release readiness", async () => {
    const seeded = await seedDeliveryScenario();
    const pullRequestStore = new InMemoryPullRequestStore();
    const githubPullRequestPort = new FakeGitHubPullRequestAdapter();

    const opened = await openPullRequestForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        repositoryId: seeded.repositoryId,
        headBranch: "feature/onboarding",
        baseBranch: "main",
        title: "Improve membership onboarding",
        body: "Implements onboarding workflow changes.",
        idempotencyKey: "pr_key_checks",
      },
      seeded.workItemStore,
      seeded.repositoryStore,
      pullRequestStore,
      githubPullRequestPort,
      operationContext,
    );

    const result = await readPullRequestChecks(
      {
        tenantContext,
        pullRequestId: opened.pullRequest.id,
      },
      pullRequestStore,
      seeded.repositoryStore,
      githubPullRequestPort,
    );

    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.evaluation.passed).toBe(true);
  });

  it("blocks check reads outside tenant scope", async () => {
    const pullRequestStore = new InMemoryPullRequestStore();
    const pullRequest = createPullRequest(
      {
        organizationId: "org_other",
        repositoryId: "repo_1",
        workItemId: "work_item_1",
        externalId: "fake_pr_99",
        number: 99,
        url: "https://github.com/PgC-git/arise/pull/99",
        headBranch: "feature/onboarding",
        baseBranch: "main",
      },
      {
        id: "pull_request_foreign",
        createdAt: operationContext.now(),
      },
    );
    await pullRequestStore.savePullRequest(pullRequest);

    await expect(
      readPullRequestChecks(
        {
          tenantContext,
          pullRequestId: pullRequest.id,
        },
        pullRequestStore,
        new InMemoryRepositoryStore(),
        new FakeGitHubPullRequestAdapter(),
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
