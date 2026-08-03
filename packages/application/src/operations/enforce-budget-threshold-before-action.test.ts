import { describe, expect, it } from "vitest";

import {
  createCostAttributionRecord,
  createTenantContext,
} from "@arise/domain";

import { InMemoryApprovalStore } from "../governance/in-memory-approval-store.js";
import {
  decideApprovalRequest,
  requestApproval,
} from "../governance/manage-approvals.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { InMemoryCostAttributionStore } from "./in-memory-cost-attribution-store.js";
import { InMemoryBudgetPauseStore } from "./in-memory-budget-pause-store.js";
import {
  BudgetThresholdPausedError,
  enforceBudgetThresholdBeforeAction,
} from "./enforce-budget-threshold-before-action.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_budget_threshold",
});

const approverContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_approver",
  correlationId: "corr_approver",
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
  state: "implementing" as const,
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

async function seedAttributedCost(
  costAttributionStore: InMemoryCostAttributionStore,
  totalCostUsd: number,
): Promise<void> {
  const attribution = createCostAttributionRecord(
    {
      organizationId: tenantContext.organizationId,
      workItemId: workItem.id,
      totalCostUsd,
      modelCostUsd: totalCostUsd,
      buildCostUsd: 0,
      sandboxCostUsd: 0,
      lineItems: [
        {
          category: "model",
          sourceType: "agent_run",
          sourceId: "run_1",
          label: "coding run",
          costUsd: totalCostUsd,
          tokens: 10_000,
        },
      ],
    },
    {
      id: "cost_attr_1",
      attributedAt: operationContext.now(),
    },
  );
  await costAttributionStore.saveCostAttribution(attribution);
}

describe("enforceBudgetThresholdBeforeAction", () => {
  it("pauses execution when a model or sandbox action would exceed the threshold", async () => {
    const workItemStore = new InMemoryWorkItemStore();
    const costAttributionStore = new InMemoryCostAttributionStore();
    const approvalStore = new InMemoryApprovalStore();
    const budgetPauseStore = new InMemoryBudgetPauseStore();

    await workItemStore.saveWorkItemVersion(workItem);
    await seedAttributedCost(costAttributionStore, 24.5);

    await expect(
      enforceBudgetThresholdBeforeAction(
        {
          tenantContext,
          workItemId: workItem.id,
          requestedCostUsd: 1,
          executionSessionId: "session_1",
          thresholdUsd: 25,
        },
        workItemStore,
        costAttributionStore,
        approvalStore,
        budgetPauseStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(BudgetThresholdPausedError);

    const activePause = await budgetPauseStore.findActiveBudgetPauseForWorkItem(workItem.id);
    expect(activePause?.status).toBe("active");
    expect(activePause?.executionSessionId).toBe("session_1");
  });

  it("allows continued execution after budget approval is granted", async () => {
    const workItemStore = new InMemoryWorkItemStore();
    const costAttributionStore = new InMemoryCostAttributionStore();
    const approvalStore = new InMemoryApprovalStore();
    const budgetPauseStore = new InMemoryBudgetPauseStore();

    await workItemStore.saveWorkItemVersion(workItem);
    await seedAttributedCost(costAttributionStore, 30);

    const approval = await requestApproval(
      {
        tenantContext,
        subjectType: "work_item",
        subjectId: workItem.id,
        approvalType: "budget_approval",
      },
      approvalStore,
      operationContext,
    );

    await decideApprovalRequest(
      {
        tenantContext: approverContext,
        approvalId: approval.id,
        decision: "approved",
      },
      approvalStore,
      operationContext,
    );

    const result = await enforceBudgetThresholdBeforeAction(
      {
        tenantContext,
        workItemId: workItem.id,
        requestedCostUsd: 2,
        thresholdUsd: 25,
      },
      workItemStore,
      costAttributionStore,
      approvalStore,
      budgetPauseStore,
      operationContext,
    );

    expect(result.evaluation.decision).toBe("allowed");
  });
});
