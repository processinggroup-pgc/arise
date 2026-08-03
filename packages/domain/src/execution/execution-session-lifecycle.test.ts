import { describe, expect, it } from "vitest";

import { createExecutionSession } from "./execution-session.js";
import {
  assertExecutionSessionAcceptsToolActions,
  markExecutionSessionReady,
  startExecutionSessionProvisioning,
} from "./execution-session-lifecycle.js";

const startedAt = new Date("2026-08-03T12:00:00.000Z");

describe("execution session lifecycle", () => {
  it("transitions from requested to ready after provisioning", () => {
    const requested = createExecutionSession(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
      },
      { id: "session_1", startedAt },
    );

    const provisioning = startExecutionSessionProvisioning(requested);
    const ready = markExecutionSessionReady(
      provisioning,
      "fake_sandbox_session_1",
      "/workspace/PgC-git/arise/feature/onboarding",
    );

    expect(ready.state).toBe("ready");
    expect(ready.sandboxSessionId).toBe("fake_sandbox_session_1");
  });

  it("accepts tool actions only when the sandbox workspace is ready", () => {
    const requested = createExecutionSession(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
      },
      { id: "session_2", startedAt },
    );

    expect(() => {
      assertExecutionSessionAcceptsToolActions(requested);
    }).toThrow("Execution session is not ready for tool actions");

    const ready = markExecutionSessionReady(
      startExecutionSessionProvisioning(requested),
      "fake_sandbox_session_2",
      "/workspace/PgC-git/arise/feature/onboarding",
    );

    expect(() => {
      assertExecutionSessionAcceptsToolActions(ready);
    }).not.toThrow();
  });
});
