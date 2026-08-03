import { describe, expect, it } from "vitest";

import {
  createExecutionEvidence,
  createExecutionSession,
  createFinding,
  createTenantContext,
} from "@arise/domain";

import { InMemoryExecutionSessionStore } from "../execution/in-memory-execution-session-store.js";
import { ExecutionSessionScopeError } from "../execution/provision-execution-session.js";
import { InMemoryApprovalStore } from "../governance/in-memory-approval-store.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { FakeTestRunnerAdapter } from "./fake-test-runner-adapter.js";
import { InMemoryFindingStore } from "./in-memory-finding-store.js";
import { generateReleaseEvidence } from "./generate-release-evidence.js";
import { InMemoryReleaseEvidenceStore } from "./in-memory-release-evidence-store.js";
import { orchestrateVerification } from "./orchestrate-verification.js";
import { InMemoryTestRunStore } from "./in-memory-test-run-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_release_evidence",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const workItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 1,
  title: "Improve membership onboarding",
  type: "feature" as const,
  state: "verifying" as const,
  riskLevel: "high" as const,
  ownerId: "user_owner",
  problemStatement: "Onboarding is fragmented.",
  targetUser: "Platform engineer",
  currentBehavior: "Manual onboarding.",
  desiredBehavior: "Single workflow onboarding.",
  measurableOutcome: "One path onboarding.",
  dataClassification: "internal" as const,
  constraints: [],
  nonGoals: [],
  affectedSystems: ["memberships API"],
  dependencies: [],
  decisionAuthority: "user_owner",
  unresolvedQuestions: [],
  acceptanceCriteria: [
    {
      given: "A new member account",
      when: "They start onboarding",
      then: "The workflow completes in one path",
    },
  ],
  createdAt: new Date("2026-08-03T12:00:00.000Z"),
};

describe("generateReleaseEvidence", () => {
  it("generates tenant-scoped release evidence from verification and reviewer outputs", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const testRunStore = new InMemoryTestRunStore();
    const findingStore = new InMemoryFindingStore();
    const approvalStore = new InMemoryApprovalStore();
    const releaseEvidenceStore = new InMemoryReleaseEvidenceStore();
    const workItemStore = new InMemoryWorkItemStore();
    await workItemStore.saveWorkItemVersion(workItem);

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: workItem.id,
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
        workItemId: workItem.id,
        executionSessionId: session.id,
        categories: ["unit", "architecture"],
      },
      executionSessionStore,
      testRunStore,
      new FakeTestRunnerAdapter(),
      operationContext,
    );

    const executionEvidence = createExecutionEvidence(
      {
        organizationId: tenantContext.organizationId,
        executionSessionId: session.id,
        agentRunId: "run_coding_1",
        workItemId: workItem.id,
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/memberships/route.ts", "src/memberships/route.test.ts"],
        diffs: [
          {
            path: "src/memberships/route.ts",
            before: "export function listMemberships() {}",
            after: "export function listMemberships() { return []; }",
          },
          {
            path: "src/memberships/route.test.ts",
            before: "describe('route', () => {});",
            after: "describe('route', () => { it('completes onboarding', () => {}); });",
          },
        ],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      {
        id: "evidence_1",
        capturedAt: operationContext.now(),
      },
    );

    const result = await generateReleaseEvidence(
      {
        tenantContext,
        workItemId: workItem.id,
        executionSessionId: session.id,
        verificationEvaluation: verification.evaluation,
        reviewerOutput: {
          schemaRef: "schemas/reviewer-output.schema.json",
          workItemId: workItem.id,
          agentRunId: "run_reviewer_1",
          codingRunId: "run_coding_1",
          executionEvidenceId: "evidence_1",
          architectureRunId: "run_arch_1",
          verdict: "approved",
          summary: "Approved.",
          requirementCoverage: [
            {
              criterionIndex: 0,
              given: workItem.acceptanceCriteria[0]?.given ?? "",
              when: workItem.acceptanceCriteria[0]?.when ?? "",
              then: workItem.acceptanceCriteria[0]?.then ?? "",
              status: "covered",
              evidence: "Linked tests updated",
            },
          ],
          findings: [],
          raisedFindingIds: [],
          generatedAt: operationContext.now().toISOString(),
        },
        executionEvidence,
      },
      workItemStore,
      executionSessionStore,
      testRunStore,
      findingStore,
      approvalStore,
      releaseEvidenceStore,
      operationContext,
    );

    expect(result.evidence.complete).toBe(true);
    expect(result.evidence.status).toBe("complete");
    expect(result.evidence.tests).toHaveLength(2);
    expect(result.evidence.requirementCoverage[0]?.status).toBe("covered");
    expect(await releaseEvidenceStore.listReleaseEvidenceForWorkItem(workItem.id)).toHaveLength(1);
  });

  it("blocks release evidence when critical findings remain open", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const testRunStore = new InMemoryTestRunStore();
    const findingStore = new InMemoryFindingStore();
    const approvalStore = new InMemoryApprovalStore();
    const releaseEvidenceStore = new InMemoryReleaseEvidenceStore();
    const workItemStore = new InMemoryWorkItemStore();
    await workItemStore.saveWorkItemVersion(workItem);

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: workItem.id,
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_2",
        workspacePath: "/workspace/PgC-git/arise/feature/onboarding",
        state: "ready",
      },
      { id: "session_2", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    const verification = await orchestrateVerification(
      {
        tenantContext,
        workItemId: workItem.id,
        executionSessionId: session.id,
        categories: ["unit"],
      },
      executionSessionStore,
      testRunStore,
      new FakeTestRunnerAdapter(),
      operationContext,
    );

    const finding = createFinding(
      {
        organizationId: tenantContext.organizationId,
        workItemId: workItem.id,
        category: "security",
        severity: "critical",
        title: "Secret material detected",
        evidence: "execution/session_2/tool_1.json",
        remediation: "Remove secrets",
      },
      { id: "finding_1", raisedAt: operationContext.now() },
    );
    await findingStore.saveFinding(finding);

    const result = await generateReleaseEvidence(
      {
        tenantContext,
        workItemId: workItem.id,
        executionSessionId: session.id,
        verificationEvaluation: verification.evaluation,
      },
      workItemStore,
      executionSessionStore,
      testRunStore,
      findingStore,
      approvalStore,
      releaseEvidenceStore,
      operationContext,
    );

    expect(result.evidence.complete).toBe(false);
    expect(result.evidence.status).toBe("blocked");
    expect(result.evidence.blockers.some((blocker) => blocker.includes("release-blocking"))).toBe(
      true,
    );
  });

  it("blocks generation when the execution session is outside tenant scope", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const workItemStore = new InMemoryWorkItemStore();
    await workItemStore.saveWorkItemVersion(workItem);

    const session = createExecutionSession(
      {
        organizationId: "org_other",
        workItemId: workItem.id,
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_3",
        workspacePath: "/workspace/other",
        state: "ready",
      },
      { id: "session_foreign", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    await expect(
      generateReleaseEvidence(
        {
          tenantContext,
          workItemId: workItem.id,
          executionSessionId: session.id,
          verificationEvaluation: {
            passed: true,
            completedCategories: ["unit"],
            failedCategories: [],
          },
        },
        workItemStore,
        executionSessionStore,
        new InMemoryTestRunStore(),
        new InMemoryFindingStore(),
        new InMemoryApprovalStore(),
        new InMemoryReleaseEvidenceStore(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ExecutionSessionScopeError);
  });
});
