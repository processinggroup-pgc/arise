import { describe, expect, it } from "vitest";

import {
  createDeployment,
  createReleaseEvidence,
  createTenantContext,
} from "@arise/domain";

import { InMemoryApprovalStore } from "../governance/in-memory-approval-store.js";
import {
  ApprovalRequiredError,
  decideApprovalRequest,
  requestApproval,
} from "../governance/manage-approvals.js";
import { InMemoryReleaseEvidenceStore } from "../verification/in-memory-release-evidence-store.js";
import {
  enforceProductionPromotionBoundary,
  ProductionPromotionBlockedError,
} from "./enforce-production-promotion-boundary.js";
import { InMemoryDeploymentStore } from "./in-memory-deployment-store.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_production_promotion",
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

const workItemId = "work_item_1";

const compatibleManifests = {
  preview: {
    environment: "preview" as const,
    requirements: [
      { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
      { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://preview.example.com" },
    ],
  },
  production: {
    environment: "production" as const,
    requirements: [
      { key: "DATABASE_URL", required: true, valueRef: "SECRET_REF:database-url" },
      { key: "NEXT_PUBLIC_APP_URL", required: true, valueRef: "https://app.example.com" },
    ],
  },
};

const passingChecks = {
  passed: true,
  failedRequiredChecks: [],
  pendingRequiredChecks: [],
};

async function seedApprovals(approvalStore: InMemoryApprovalStore): Promise<void> {
  for (const approvalType of ["release_approval", "production_promotion"] as const) {
    const approval = await requestApproval(
      {
        tenantContext,
        subjectType: "work_item",
        subjectId: workItemId,
        approvalType,
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
  }
}

async function seedReadyDeliveryState(): Promise<{
  releaseEvidenceStore: InMemoryReleaseEvidenceStore;
  deploymentStore: InMemoryDeploymentStore;
  releaseEvidenceId: string;
  previewDeploymentId: string;
}> {
  const releaseEvidenceStore = new InMemoryReleaseEvidenceStore();
  const deploymentStore = new InMemoryDeploymentStore();

  const releaseEvidence = createReleaseEvidence(
    {
      organizationId: tenantContext.organizationId,
      workItemId,
      workItemVersion: 1,
      status: "complete",
      complete: true,
      requirementCoverage: [
        {
          criterionIndex: 0,
          given: "A new member account",
          when: "They start onboarding",
          then: "The workflow completes in one path",
          status: "covered",
          evidence: "test evidence",
        },
      ],
      tests: [
        {
          category: "unit",
          status: "passed",
          artifactRef: "artifacts/unit.xml",
          counts: { total: 1, passed: 1, failed: 0, skipped: 0 },
        },
      ],
      policies: [],
      findings: [],
      approvals: [],
      blockers: [],
    },
    {
      id: "release_evidence_1",
      generatedAt: operationContext.now(),
    },
  );
  await releaseEvidenceStore.saveReleaseEvidence(releaseEvidence);

  const deployment = createDeployment(
    {
      organizationId: tenantContext.organizationId,
      repositoryId: "repo_1",
      workItemId,
      provider: "vercel",
      externalId: "dpl_preview_1",
      environment: "preview",
      previewUrl: "https://preview.example.com",
      status: "ready",
    },
    {
      id: "deployment_preview_1",
      createdAt: operationContext.now(),
    },
  );
  await deploymentStore.saveDeployment(deployment);

  return {
    releaseEvidenceStore,
    deploymentStore,
    releaseEvidenceId: releaseEvidence.id,
    previewDeploymentId: deployment.id,
  };
}

describe("enforceProductionPromotionBoundary", () => {
  it("requires release and production approvals before promotion", async () => {
    const approvalStore = new InMemoryApprovalStore();
    const seeded = await seedReadyDeliveryState();

    await expect(
      enforceProductionPromotionBoundary(
        {
          tenantContext,
          workItemId,
          releaseEvidenceId: seeded.releaseEvidenceId,
          pullRequestCheckEvaluation: passingChecks,
          previewDeploymentId: seeded.previewDeploymentId,
          previewManifest: compatibleManifests.preview,
          productionManifest: compatibleManifests.production,
        },
        seeded.releaseEvidenceStore,
        seeded.deploymentStore,
        approvalStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ApprovalRequiredError);
  });

  it("blocks promotion when delivery gates fail", async () => {
    const approvalStore = new InMemoryApprovalStore();
    await seedApprovals(approvalStore);
    const seeded = await seedReadyDeliveryState();

    await expect(
      enforceProductionPromotionBoundary(
        {
          tenantContext,
          workItemId,
          releaseEvidenceId: seeded.releaseEvidenceId,
          pullRequestCheckEvaluation: {
            passed: false,
            failedRequiredChecks: ["quality"],
            pendingRequiredChecks: [],
          },
          previewDeploymentId: seeded.previewDeploymentId,
          previewManifest: compatibleManifests.preview,
          productionManifest: compatibleManifests.production,
        },
        seeded.releaseEvidenceStore,
        seeded.deploymentStore,
        approvalStore,
        operationContext,
      ),
    ).rejects.toBeInstanceOf(ProductionPromotionBlockedError);
  });

  it("allows promotion when approvals and delivery gates pass", async () => {
    const approvalStore = new InMemoryApprovalStore();
    await seedApprovals(approvalStore);
    const seeded = await seedReadyDeliveryState();

    const result = await enforceProductionPromotionBoundary(
      {
        tenantContext,
        workItemId,
        releaseEvidenceId: seeded.releaseEvidenceId,
        pullRequestCheckEvaluation: passingChecks,
        previewDeploymentId: seeded.previewDeploymentId,
        previewManifest: compatibleManifests.preview,
        productionManifest: compatibleManifests.production,
      },
      seeded.releaseEvidenceStore,
      seeded.deploymentStore,
      approvalStore,
      operationContext,
    );

    expect(result.policyDecision.decision).toBe("approval_required");
    expect(result.readiness.allowed).toBe(true);
  });
});
