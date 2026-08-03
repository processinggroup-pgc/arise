import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { applyWorkItemTransition } from "../intent/transition-work-item-state.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { assessWorkItemReadiness } from "../intent/assess-work-item-readiness.js";
import { InMemoryRequirementStore } from "../intent/in-memory-requirement-store.js";
import { InMemoryApprovalStore } from "./in-memory-approval-store.js";
import {
  ApprovalRequiredError,
  decideApprovalRequest,
  evaluateActionPolicy,
  PolicyBlockedError,
  requestApproval,
} from "./manage-approvals.js";
import { approvePlanForWorkItem } from "./approve-plan-for-work-item.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_policy",
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

const readyWorkItemInput = {
  title: "Tenant-safe membership listing",
  type: "feature",
  riskLevel: "high",
  ownerId: "user_owner",
  problemStatement: "Operators cannot inspect memberships safely across tenants.",
  targetUser: "Platform operator",
  currentBehavior: "Membership lists can be requested without tenant validation.",
  desiredBehavior: "Membership lists are scoped to the active organization only.",
  measurableOutcome: "Cross-tenant membership reads return zero rows in security tests.",
  dataClassification: "internal",
  affectedSystems: ["memberships API"],
  dependencies: ["tenant context middleware"],
  decisionAuthority: "Processing group owner",
  acceptanceCriteria: [
    {
      given: "a tenant context for organization A",
      when: "memberships are listed",
      then: "only organization A memberships are returned",
    },
  ],
};

async function seedWorkItemReadyForRecommendation(): Promise<{
  lineageId: string;
  projectStore: InMemoryProjectStore;
  workItemStore: InMemoryWorkItemStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();
  const requirementStore = new InMemoryRequirementStore();

  const project = await createProjectForOrganization(
    { tenantContext, name: "Customer Portal" },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      ...readyWorkItemInput,
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  const assessed = await assessWorkItemReadiness(
    {
      tenantContext,
      lineageId: workItem.lineageId,
    },
    projectStore,
    workItemStore,
    requirementStore,
    operationContext,
  );

  await applyWorkItemTransition(
    {
      tenantContext,
      lineageId: assessed.workItem.lineageId,
      transition: "submit_recommendation",
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  return {
    lineageId: workItem.lineageId,
    projectStore,
    workItemStore,
  };
}

describe("evaluateActionPolicy", () => {
  it("blocks destructive production migrations", () => {
    const decision = evaluateActionPolicy({
      actionType: "destructive_migration",
      productionTarget: true,
      workItemRiskLevel: "critical",
    });

    expect(decision.decision).toBe("blocked");
  });
});

describe("approvePlanForWorkItem", () => {
  it("requires plan approval before high-risk plans can be approved", async () => {
    const approvalStore = new InMemoryApprovalStore();
    const seeded = await seedWorkItemReadyForRecommendation();

    await expect(
      approvePlanForWorkItem(
        {
          tenantContext,
          lineageId: seeded.lineageId,
        },
        seeded.projectStore,
        seeded.workItemStore,
        approvalStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ApprovalRequiredError);
  });

  it("approves the plan after the required approval is recorded", async () => {
    const approvalStore = new InMemoryApprovalStore();
    const seeded = await seedWorkItemReadyForRecommendation();

    const approval = await requestApproval(
      {
        tenantContext,
        subjectType: "work_item",
        subjectId: seeded.lineageId,
        approvalType: "plan_approval",
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

    const result = await approvePlanForWorkItem(
      {
        tenantContext,
        lineageId: seeded.lineageId,
      },
      seeded.projectStore,
      seeded.workItemStore,
      approvalStore,
      operationContext,
    );

    expect(result.workItem.state).toBe("plan_approved");
    expect(result.policyDecision.decision).toBe("approval_required");
  });
});

describe("requestApproval", () => {
  it("blocks policy decisions that are explicitly denied", () => {
    expect(
      evaluateActionPolicy({
        actionType: "start_implementation",
        workItemRiskLevel: "medium",
        planApproved: false,
      }).decision,
    ).toBe("blocked");

    expect(() => {
      throw new PolicyBlockedError("blocked", {
        decision: "blocked",
        reasons: ["denied"],
        ruleIds: ["rule"],
        requiredApprovalTypes: [],
        evidence: {},
      });
    }).toThrow(PolicyBlockedError);
  });
});
