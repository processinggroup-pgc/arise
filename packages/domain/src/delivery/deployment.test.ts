import { describe, expect, it } from "vitest";

import {
  assertDeploymentMatchesProviderEvidence,
  createDeployment,
  evaluateDeploymentReadiness,
} from "./deployment.js";

describe("deployment delivery", () => {
  it("creates a tenant-scoped preview deployment record", () => {
    const deployment = createDeployment(
      {
        organizationId: "org_123",
        repositoryId: "repo_1",
        workItemId: "work_item_1",
        pullRequestId: "pull_request_1",
        provider: "vercel",
        externalId: "dpl_123",
        environment: "preview",
        previewUrl: "https://arise-preview.vercel.app",
        status: "building",
      },
      {
        id: "deployment_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(deployment.environment).toBe("preview");
    expect(deployment.status).toBe("building");
  });

  it("marks preview deployments ready only when provider status is ready", () => {
    const ready = evaluateDeploymentReadiness({
      status: "ready",
      previewUrl: "https://arise-preview.vercel.app",
    });
    const failed = evaluateDeploymentReadiness({
      status: "error",
      previewUrl: "https://arise-preview.vercel.app",
    });

    expect(ready.ready).toBe(true);
    expect(failed.ready).toBe(false);
  });

  it("records provider failure even when an agent claims success", () => {
    const result = assertDeploymentMatchesProviderEvidence({
      providerStatus: "error",
      agentClaimedSuccess: true,
    });

    expect(result.recordedStatus).toBe("error");
    expect(result.providerEvidenceWins).toBe(true);
  });
});
