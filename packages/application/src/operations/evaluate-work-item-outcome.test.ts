import { describe, expect, it } from "vitest";

import {
  createCostAttributionRecord,
  createReleaseEvidence,
  createTenantContext,
} from "@arise/domain";

import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { InMemoryReleaseEvidenceStore } from "../verification/in-memory-release-evidence-store.js";
import { evaluateWorkItemOutcome } from "./evaluate-work-item-outcome.js";
import { InMemoryCostAttributionStore } from "./in-memory-cost-attribution-store.js";
import { InMemoryIncidentStore } from "./in-memory-incident-store.js";
import { InMemoryTechnicalDebtStore } from "./in-memory-technical-debt-store.js";
import { InMemoryWorkItemOutcomeStore } from "./in-memory-work-item-outcome-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_outcome",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

const releasedWorkItem = {
  id: "work_item_1",
  lineageId: "lineage_123",
  organizationId: "org_123",
  projectId: "project_1",
  version: 2,
  title: "Improve membership onboarding",
  type: "feature" as const,
  state: "released" as const,
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
  createdAt: new Date("2026-08-01T12:00:00.000Z"),
};

describe("evaluateWorkItemOutcome", () => {
  it("records outcome, cost, incidents and debt when the evaluation window closes", async () => {
    const workItemStore = new InMemoryWorkItemStore();
    const costAttributionStore = new InMemoryCostAttributionStore();
    const incidentStore = new InMemoryIncidentStore();
    const technicalDebtStore = new InMemoryTechnicalDebtStore();
    const releaseEvidenceStore = new InMemoryReleaseEvidenceStore();
    const workItemOutcomeStore = new InMemoryWorkItemOutcomeStore();

    await workItemStore.saveWorkItemVersion(releasedWorkItem);

    await costAttributionStore.saveCostAttribution(
      createCostAttributionRecord(
        {
          organizationId: tenantContext.organizationId,
          workItemId: releasedWorkItem.id,
          totalCostUsd: 12.5,
          modelCostUsd: 10,
          buildCostUsd: 1.5,
          sandboxCostUsd: 1,
          lineItems: [
            {
              category: "model",
              sourceType: "agent_run",
              sourceId: "run_1",
              label: "coding run",
              costUsd: 10,
              tokens: 8_000,
            },
            {
              category: "build",
              sourceType: "tool_call",
              sourceId: "tool_1",
              label: "build.run",
              costUsd: 1.5,
            },
            {
              category: "sandbox",
              sourceType: "execution_session",
              sourceId: "session_1",
              label: "Sandbox session",
              costUsd: 1,
              durationMs: 300_000,
            },
          ],
        },
        {
          id: "cost_attr_1",
          attributedAt: operationContext.now(),
        },
      ),
    );

    await releaseEvidenceStore.saveReleaseEvidence(
      createReleaseEvidence(
        {
          organizationId: tenantContext.organizationId,
          workItemId: releasedWorkItem.id,
          workItemVersion: releasedWorkItem.version,
          status: "complete",
          complete: true,
          requirementCoverage: [],
          tests: [],
          policies: [],
          findings: [],
          approvals: [],
          blockers: [],
        },
        {
          id: "release_evidence_1",
          generatedAt: operationContext.now(),
        },
      ),
    );

    const result = await evaluateWorkItemOutcome(
      {
        tenantContext,
        workItemId: releasedWorkItem.id,
        evaluationWindowClosedAt: operationContext.now(),
        lessons: ["Delivery completed with full verification evidence"],
      },
      workItemStore,
      costAttributionStore,
      incidentStore,
      technicalDebtStore,
      releaseEvidenceStore,
      workItemOutcomeStore,
      operationContext,
    );

    expect(result.outcome.complete).toBe(true);
    expect(result.outcome.cost.totalCostUsd).toBe(12.5);
    expect(result.outcome.incidentCount).toBe(0);
    expect(result.outcome.openTechnicalDebtCount).toBe(0);
    expect(result.outcome.lessons).toHaveLength(1);
  });
});
