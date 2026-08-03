import { describe, expect, it } from "vitest";

import {
  createExecutionSession,
  createTenantContext,
  FindingLifecycleError,
} from "@arise/domain";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { FakeTestRunnerAdapter } from "./fake-test-runner-adapter.js";
import { InMemoryTestRunStore } from "./in-memory-test-run-store.js";
import { InMemoryFindingStore } from "./in-memory-finding-store.js";
import { orchestrateVerification } from "./orchestrate-verification.js";
import { raiseFindingsFromVerification } from "./raise-findings-from-verification.js";
import {
  resolveFindingForWorkItem,
  startFindingRemediationForWorkItem,
  waiveFindingForWorkItem,
  FindingScopeError,
} from "./manage-finding-lifecycle.js";
import { raiseFinding } from "./raise-finding.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_findings",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

async function seedWorkItem(): Promise<{
  workItemId: string;
  workItemStore: InMemoryWorkItemStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();

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
      problemStatement: "Membership onboarding is fragmented.",
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

  return { workItemId: workItem.id, workItemStore };
}

describe("finding lifecycle application", () => {
  it("raises findings from failed verification runs and resolves them through remediation", async () => {
    const seeded = await seedWorkItem();
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const testRunStore = new InMemoryTestRunStore();
    const findingStore = new InMemoryFindingStore();

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: seeded.workItemId,
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "ready",
      },
      { id: "session_1", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    const verification = await orchestrateVerification(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        executionSessionId: session.id,
        categories: ["unit", "security"],
      },
      executionSessionStore,
      testRunStore,
      new FakeTestRunnerAdapter({
        security: { passed: 1, failed: 1, skipped: 0, durationMs: 900 },
      }),
      operationContext,
    );

    const findings = await raiseFindingsFromVerification(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        runs: verification.runs,
        evaluation: verification.evaluation,
      },
      seeded.workItemStore,
      findingStore,
      operationContext,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe("security");
    expect(findings[0]?.status).toBe("open");

    const inRemediation = await startFindingRemediationForWorkItem(
      { tenantContext, findingId: findings[0]?.id ?? "" },
      findingStore,
      new Date("2026-08-03T12:10:00.000Z"),
    );
    const resolved = await resolveFindingForWorkItem(
      { tenantContext, findingId: inRemediation.id },
      findingStore,
      new Date("2026-08-03T12:30:00.000Z"),
    );

    expect(resolved.status).toBe("resolved");
  });

  it("blocks waiving security findings raised manually", async () => {
    const seeded = await seedWorkItem();
    const findingStore = new InMemoryFindingStore();

    const finding = await raiseFinding(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        category: "security",
        severity: "critical",
        title: "Cross-tenant data exposure",
        evidence: "security/report_1.json",
        remediation: "Enforce tenant scoping in repository queries",
      },
      seeded.workItemStore,
      findingStore,
      operationContext,
    );

    await expect(
      waiveFindingForWorkItem(
        { tenantContext, findingId: finding.id },
        findingStore,
        new Date("2026-08-03T12:15:00.000Z"),
      ),
    ).rejects.toBeInstanceOf(FindingLifecycleError);
  });

  it("blocks finding management outside tenant scope", async () => {
    const seeded = await seedWorkItem();
    const findingStore = new InMemoryFindingStore();

    const finding = await raiseFinding(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        category: "quality",
        severity: "medium",
        title: "Flaky component test",
        evidence: "verification/session_1/component/test_run_1.json",
        remediation: "Stabilize component test setup",
      },
      seeded.workItemStore,
      findingStore,
      operationContext,
    );

    const foreignContext = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      resolveFindingForWorkItem(
        { tenantContext: foreignContext, findingId: finding.id },
        findingStore,
        operationContext.now(),
      ),
    ).rejects.toBeInstanceOf(FindingScopeError);
  });
});
