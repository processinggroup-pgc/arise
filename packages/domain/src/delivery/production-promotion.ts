export interface ProductionPromotionReadinessInput {
  releaseEvidenceComplete: boolean;
  pullRequestChecksPassed: boolean;
  previewDeploymentReady: boolean;
  environmentRequirementsCompatible: boolean;
  releaseBlockingFindingsCount: number;
}

export interface ProductionPromotionReadinessEvaluation {
  allowed: boolean;
  blockers: string[];
}

export function evaluateProductionPromotionReadiness(
  input: ProductionPromotionReadinessInput,
): ProductionPromotionReadinessEvaluation {
  const blockers: string[] = [];

  if (!input.releaseEvidenceComplete) {
    blockers.push("Release evidence is incomplete");
  }

  if (!input.pullRequestChecksPassed) {
    blockers.push("Required pull request checks have not passed");
  }

  if (!input.previewDeploymentReady) {
    blockers.push("Preview deployment is not ready");
  }

  if (!input.environmentRequirementsCompatible) {
    blockers.push("Preview environment does not satisfy production requirements");
  }

  if (input.releaseBlockingFindingsCount > 0) {
    blockers.push(
      `${String(input.releaseBlockingFindingsCount)} release-blocking finding(s) remain unresolved`,
    );
  }

  return {
    allowed: blockers.length === 0,
    blockers,
  };
}
