import { describe, expect, it } from "vitest";

import { createAgentRun } from "./agent-run.js";

describe("agent run", () => {
  it("records model identity and version for a pending run", () => {
    const run = createAgentRun(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        agentType: "discovery",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
      },
      {
        id: "run_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(run.status).toBe("pending");
    expect(run.modelProvider).toBe("openai");
    expect(run.modelName).toBe("gpt-4.1");
    expect(run.modelVersion).toBe("2026-08-01");
    expect(run.tokenUsage).toBe(0);
    expect(run.costUsd).toBe(0);
  });
});
