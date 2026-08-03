import { describe, expect, it } from "vitest";

import { evaluateProductionPromotionReadiness } from "./production-promotion.js";

describe("production promotion boundary", () => {
  it("blocks promotion when release evidence is incomplete", () => {
    const evaluation = evaluateProductionPromotionReadiness({
      releaseEvidenceComplete: false,
      pullRequestChecksPassed: true,
      previewDeploymentReady: true,
      environmentRequirementsCompatible: true,
      releaseBlockingFindingsCount: 0,
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.blockers.some((blocker) => blocker.includes("Release evidence"))).toBe(true);
  });

  it("blocks promotion when release-blocking findings remain", () => {
    const evaluation = evaluateProductionPromotionReadiness({
      releaseEvidenceComplete: true,
      pullRequestChecksPassed: true,
      previewDeploymentReady: true,
      environmentRequirementsCompatible: true,
      releaseBlockingFindingsCount: 2,
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.blockers.some((blocker) => blocker.includes("finding"))).toBe(true);
  });

  it("allows promotion when all delivery gates pass", () => {
    const evaluation = evaluateProductionPromotionReadiness({
      releaseEvidenceComplete: true,
      pullRequestChecksPassed: true,
      previewDeploymentReady: true,
      environmentRequirementsCompatible: true,
      releaseBlockingFindingsCount: 0,
    });

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.blockers).toHaveLength(0);
  });
});
