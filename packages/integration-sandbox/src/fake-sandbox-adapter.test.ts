import { describe, expect, it } from "vitest";

import { FakeSandboxAdapter } from "./fake-sandbox-adapter.js";
import { SandboxProvisionError } from "./sandbox-port.js";

describe("FakeSandboxAdapter", () => {
  it("provisions an ephemeral workspace without production secrets", async () => {
    const adapter = new FakeSandboxAdapter();

    const result = await adapter.provision({
      sessionId: "session_1",
      organizationId: "org_123",
      repositoryFullName: "PgC-git/arise",
      branch: "feature/onboarding",
      limits: {
        maxDurationMs: 1_800_000,
        maxMemoryMb: 512,
        maxCpuMillis: 60_000,
        networkEgressAllowed: false,
      },
    });

    expect(result.productionSecretsMounted).toBe(false);
    expect(result.workspacePath).toContain("PgC-git/arise");
    expect(adapter.getSession(result.sandboxSessionId)?.branch).toBe("feature/onboarding");
  });

  it("rejects sandboxes that request network egress", async () => {
    const adapter = new FakeSandboxAdapter();

    await expect(
      adapter.provision({
        sessionId: "session_2",
        organizationId: "org_123",
        repositoryFullName: "PgC-git/arise",
        branch: "feature/onboarding",
        limits: {
          maxDurationMs: 1_800_000,
          maxMemoryMb: 512,
          maxCpuMillis: 60_000,
          networkEgressAllowed: true,
        },
      }),
    ).rejects.toBeInstanceOf(SandboxProvisionError);
  });
});
