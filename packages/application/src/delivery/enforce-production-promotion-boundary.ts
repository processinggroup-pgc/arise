import {
  evaluateDeploymentReadiness,
  evaluateProductionPromotionReadiness,
  type EnvironmentRequirementsManifest,
  type PolicyDecision,
  type ProductionPromotionReadinessEvaluation,
  type PullRequestCheckEvaluation,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { ApprovalStore } from "../governance/approval-store.js";
import {
  ApprovalRequiredError,
  assertRequiredApprovals,
  evaluateActionPolicy,
  PolicyBlockedError,
} from "../governance/manage-approvals.js";
import type { ReleaseEvidenceStore } from "../verification/release-evidence-store.js";
import { compareEnvironmentRequirementsForDelivery } from "./compare-environment-requirements.js";
import type { DeploymentStore } from "./deployment-store.js";

export interface EnforceProductionPromotionBoundaryCommand {
  tenantContext: TenantContext;
  workItemId: string;
  releaseEvidenceId: string;
  pullRequestCheckEvaluation: PullRequestCheckEvaluation;
  previewDeploymentId: string;
  previewManifest: EnvironmentRequirementsManifest;
  productionManifest: EnvironmentRequirementsManifest;
}

export interface EnforceProductionPromotionBoundaryResult {
  policyDecision: PolicyDecision;
  readiness: ProductionPromotionReadinessEvaluation;
}

export class ProductionPromotionBlockedError extends Error {
  constructor(
    message: string,
    readonly blockers: string[],
  ) {
    super(message);
    this.name = "ProductionPromotionBlockedError";
  }
}

export async function enforceProductionPromotionBoundary(
  command: EnforceProductionPromotionBoundaryCommand,
  releaseEvidenceStore: ReleaseEvidenceStore,
  deploymentStore: DeploymentStore,
  approvalStore: ApprovalStore,
  operationContext: IdentityOperationContext,
): Promise<EnforceProductionPromotionBoundaryResult> {
  const policyDecision = evaluateActionPolicy({
    actionType: "request_production_promotion",
    productionTarget: true,
  });

  await assertRequiredApprovals(
    policyDecision,
    command.tenantContext.organizationId,
    "work_item",
    command.workItemId,
    approvalStore,
    operationContext.now(),
  );

  const releaseEvidence = await releaseEvidenceStore.findReleaseEvidenceById(
    command.releaseEvidenceId,
  );
  if (releaseEvidence === undefined) {
    throw new AgentRunScopeError("Release evidence was not found");
  }

  if (releaseEvidence.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Release evidence is outside the tenant scope");
  }

  if (releaseEvidence.workItemId !== command.workItemId) {
    throw new AgentRunScopeError("Release evidence work item mismatch");
  }

  const previewDeployment = await deploymentStore.findDeploymentById(command.previewDeploymentId);
  if (previewDeployment === undefined) {
    throw new AgentRunScopeError("Preview deployment was not found");
  }

  if (previewDeployment.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Preview deployment is outside the tenant scope");
  }

  if (previewDeployment.workItemId !== command.workItemId) {
    throw new AgentRunScopeError("Preview deployment work item mismatch");
  }

  if (previewDeployment.environment !== "preview") {
    throw new AgentRunScopeError("Deployment is not a preview deployment");
  }

  const deploymentReadiness = evaluateDeploymentReadiness({
    status: previewDeployment.status,
    previewUrl: previewDeployment.previewUrl,
  });

  const environmentComparison = compareEnvironmentRequirementsForDelivery({
    preview: command.previewManifest,
    production: command.productionManifest,
  });

  const releaseBlockingFindingsCount = releaseEvidence.findings.filter(
    (finding) => finding.blocking && finding.status !== "resolved",
  ).length;

  const readiness = evaluateProductionPromotionReadiness({
    releaseEvidenceComplete: releaseEvidence.complete,
    pullRequestChecksPassed: command.pullRequestCheckEvaluation.passed,
    previewDeploymentReady: deploymentReadiness.ready,
    environmentRequirementsCompatible: environmentComparison.comparison.compatible,
    releaseBlockingFindingsCount,
  });

  if (!readiness.allowed) {
    throw new ProductionPromotionBlockedError(readiness.blockers.join("; "), readiness.blockers);
  }

  return {
    policyDecision,
    readiness,
  };
}

export { ApprovalRequiredError, PolicyBlockedError };
