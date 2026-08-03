import { describe, expect, it } from "vitest";

import { createAgentRun } from "./agent-run.js";
import {
  assertAgentRunAcceptsToolActions,
  cancelAgentRun,
  failAgentRun,
  resumeAgentRun,
  startAgentRun,
} from "./agent-run-lifecycle.js";

const baseRun = createAgentRun(
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

describe("agent run lifecycle", () => {
  it("starts, fails, and resumes a durable run", () => {
    const running = startAgentRun(baseRun);
    expect(running.status).toBe("running");

    const failed = failAgentRun(running);
    expect(failed.status).toBe("failed");

    const resumed = resumeAgentRun(failed);
    expect(resumed.status).toBe("running");
  });

  it("cancels pending or running runs", () => {
    const cancelled = cancelAgentRun(startAgentRun(baseRun));
    expect(cancelled.status).toBe("cancelled");
  });

  it("blocks tool actions on cancelled and failed runs", () => {
    expect(() => {
      assertAgentRunAcceptsToolActions(cancelAgentRun(startAgentRun(baseRun)));
    }).toThrow("Cancelled agent runs cannot authorize tool actions");

    expect(() => {
      assertAgentRunAcceptsToolActions(failAgentRun(startAgentRun(baseRun)));
    }).toThrow("Failed agent runs cannot authorize tool actions until resumed");
  });
});
