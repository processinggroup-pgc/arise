import { describe, expect, it } from "vitest";

import {
  createAgentRun,
  createExecutionSession,
  createTenantContext,
  startAgentRun,
} from "@arise/domain";

import { InMemoryAgentRunStore } from "../agent-runtime/in-memory-agent-run-store.js";
import { InMemoryExecutionSessionStore } from "./in-memory-execution-session-store.js";
import { InMemoryExecutionEvidenceStore } from "./in-memory-execution-evidence-store.js";
import { captureExecutionEvidence } from "./capture-execution-evidence.js";
import { ExecutionSessionScopeError } from "./provision-execution-session.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_evidence",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("captureExecutionEvidence", () => {
  it("persists commit, diff and tool call evidence for a tenant-scoped session", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const agentRunStore = new InMemoryAgentRunStore();
    const executionEvidenceStore = new InMemoryExecutionEvidenceStore();

    const session = createExecutionSession(
      {
        organizationId: tenantContext.organizationId,
        workItemId: "work_item_1",
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

    const run = startAgentRun(
      createAgentRun(
        {
          organizationId: tenantContext.organizationId,
          workItemId: "work_item_1",
          agentType: "coding",
          registeredModelId: "model_1",
          modelProvider: "openai",
          modelName: "gpt-4.1",
          modelVersion: "2026-08-01",
        },
        { id: "run_coding_1", createdAt: operationContext.now() },
      ),
    );
    await agentRunStore.saveAgentRun(run);

    const evidence = await captureExecutionEvidence(
      {
        tenantContext,
        executionSessionId: session.id,
        agentRunId: run.id,
        workItemId: "work_item_1",
        branchName: "feature/onboarding",
        commitId: "fake_commit_1",
        changedPaths: ["src/index.ts"],
        diffs: [{ path: "src/index.ts", before: "export {}", after: "export function hello() {}" }],
        toolCallEvidenceRefs: ["execution/session_1/tool_1.json"],
      },
      executionSessionStore,
      agentRunStore,
      executionEvidenceStore,
      operationContext,
    );

    expect(evidence.commitId).toBe("fake_commit_1");
    expect(await executionEvidenceStore.listExecutionEvidenceForAgentRun(run.id)).toHaveLength(1);
  });

  it("blocks evidence capture when the execution session is outside tenant scope", async () => {
    const executionSessionStore = new InMemoryExecutionSessionStore();
    const agentRunStore = new InMemoryAgentRunStore();

    const session = createExecutionSession(
      {
        organizationId: "org_other",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        sandboxSessionId: "fake_sandbox_session_1",
        workspacePath: "/workspace/other",
        state: "ready",
      },
      { id: "session_foreign", startedAt: operationContext.now() },
    );
    await executionSessionStore.saveExecutionSession(session);

    await expect(
      captureExecutionEvidence(
        {
          tenantContext,
          executionSessionId: session.id,
          agentRunId: "run_coding_1",
          workItemId: "work_item_1",
          branchName: "feature/onboarding",
          commitId: "fake_commit_1",
          changedPaths: ["src/index.ts"],
          diffs: [{ path: "src/index.ts", before: "", after: "changed" }],
          toolCallEvidenceRefs: [],
        },
        executionSessionStore,
        agentRunStore,
        new InMemoryExecutionEvidenceStore(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ExecutionSessionScopeError);
  });
});
