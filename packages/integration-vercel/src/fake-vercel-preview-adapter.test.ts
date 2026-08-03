import { describe, expect, it } from "vitest";

import { FakeVercelPreviewAdapter } from "./fake-vercel-preview-adapter.js";
import { VercelPreviewError } from "./vercel-preview-port.js";

describe("FakeVercelPreviewAdapter", () => {
  it("creates a preview deployment with provider metadata", async () => {
    const adapter = new FakeVercelPreviewAdapter();

    const record = await adapter.createPreview({
      projectId: "arise",
      gitBranch: "feature/onboarding",
      gitCommitSha: "abc123",
      idempotencyKey: "preview_key_1",
    });

    expect(record.externalId).toMatch(/^dpl_/);
    expect(record.previewUrl).toContain("vercel.app");
    expect(record.status).toBe("building");
  });

  it("replays the same deployment for an idempotency key", async () => {
    const adapter = new FakeVercelPreviewAdapter();
    const request = {
      projectId: "arise",
      gitBranch: "feature/onboarding",
      gitCommitSha: "abc123",
      idempotencyKey: "preview_key_1",
    };

    const first = await adapter.createPreview(request);
    const second = await adapter.createPreview(request);

    expect(second.externalId).toBe(first.externalId);
  });

  it("reads provider deployment evidence and reflects status updates", async () => {
    const adapter = new FakeVercelPreviewAdapter();
    const created = await adapter.createPreview({
      projectId: "arise",
      gitBranch: "feature/onboarding",
      gitCommitSha: "abc123",
      idempotencyKey: "preview_key_2",
    });

    adapter.updateDeploymentStatus("arise", created.externalId, "ready");

    const record = await adapter.readDeployment({
      projectId: "arise",
      deploymentExternalId: created.externalId,
    });

    expect(record.status).toBe("ready");
  });

  it("rejects unknown deployment reads", async () => {
    const adapter = new FakeVercelPreviewAdapter();

    await expect(
      adapter.readDeployment({
        projectId: "arise",
        deploymentExternalId: "missing",
      }),
    ).rejects.toBeInstanceOf(VercelPreviewError);
  });
});
