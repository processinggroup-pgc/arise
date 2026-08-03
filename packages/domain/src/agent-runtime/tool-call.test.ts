import { describe, expect, it } from "vitest";

import { completeToolCall, createToolCall } from "./tool-call.js";

describe("tool call", () => {
  it("records an authorized tool call with a redacted argument payload", () => {
    const toolCall = createToolCall(
      {
        organizationId: "org_123",
        agentRunId: "run_1",
        toolName: "repository.read_file",
        argumentsRedacted: { path: "src/index.ts" },
        idempotencyKey: "read-index",
        decision: "allowed",
        status: "authorized",
      },
      {
        id: "tool_call_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(toolCall.status).toBe("authorized");
    expect(toolCall.toolName).toBe("repository.read_file");
  });

  it("completes an authorized tool call with evidence", () => {
    const authorized = createToolCall(
      {
        organizationId: "org_123",
        agentRunId: "run_1",
        toolName: "repository.read_file",
        argumentsRedacted: { path: "src/index.ts" },
        idempotencyKey: "read-index",
        decision: "allowed",
        status: "authorized",
      },
      {
        id: "tool_call_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    const completed = completeToolCall(authorized, "evidence/read-index.json");

    expect(completed.status).toBe("completed");
    expect(completed.evidenceRef).toBe("evidence/read-index.json");
  });
});
