import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { InMemoryTechnicalDebtStore } from "./in-memory-technical-debt-store.js";
import {
  assignTechnicalDebtSupportOwnerForItem,
  recordTechnicalDebtForWorkItem,
} from "./record-technical-debt-for-work-item.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_technical_debt",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("recordTechnicalDebtForWorkItem", () => {
  it("records tenant-scoped technical debt for a work item", async () => {
    const projectStore = new InMemoryProjectStore();
    const workItemStore = new InMemoryWorkItemStore();
    const technicalDebtStore = new InMemoryTechnicalDebtStore();

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
        problemStatement: "Onboarding is fragmented.",
        targetUser: "Platform engineer",
        desiredBehavior: "Single workflow onboarding.",
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

    const result = await recordTechnicalDebtForWorkItem(
      {
        tenantContext,
        workItemId: workItem.id,
        description: "Quarantined flaky architecture test pending stabilization",
        risk: "medium",
        ownerId: "user_owner",
        dueDate: new Date("2026-08-10T12:00:00.000Z"),
      },
      projectStore,
      workItemStore,
      technicalDebtStore,
      operationContext,
    );

    expect(result.item.projectId).toBe(project.id);
    expect(result.item.sourceWorkItemId).toBe(workItem.id);
    expect(result.item.status).toBe("open");
  });
});

describe("assignTechnicalDebtSupportOwnerForItem", () => {
  it("assigns support ownership for an open debt item", async () => {
    const projectStore = new InMemoryProjectStore();
    const workItemStore = new InMemoryWorkItemStore();
    const technicalDebtStore = new InMemoryTechnicalDebtStore();

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
        problemStatement: "Onboarding is fragmented.",
        targetUser: "Platform engineer",
        desiredBehavior: "Single workflow onboarding.",
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

    const recorded = await recordTechnicalDebtForWorkItem(
      {
        tenantContext,
        workItemId: workItem.id,
        description: "Temporary preview URL fallback",
        risk: "low",
        ownerId: "user_owner",
        dueDate: new Date("2026-08-10T12:00:00.000Z"),
      },
      projectStore,
      workItemStore,
      technicalDebtStore,
      operationContext,
    );

    const assigned = await assignTechnicalDebtSupportOwnerForItem(
      {
        tenantContext,
        technicalDebtId: recorded.item.id,
        supportOwnerId: "user_support",
      },
      technicalDebtStore,
      operationContext,
    );

    expect(assigned.item.supportOwnerId).toBe("user_support");
  });
});
