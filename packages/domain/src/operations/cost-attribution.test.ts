import { describe, expect, it } from "vitest";

import { createAgentRun, createExecutionSession, createToolCall } from "@arise/domain";

import {
  aggregateCostAttribution,
  attributeBuildCostFromToolCall,
  attributeModelCostFromAgentRun,
  attributeSandboxCostFromExecutionSession,
  createCostAttributionRecord,
} from "./cost-attribution.js";

const now = new Date("2026-08-03T12:00:00.000Z");
const later = new Date("2026-08-03T12:05:00.000Z");

describe("cost attribution", () => {
  it("attributes model cost from agent runs", () => {
    const run = createAgentRun(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        agentType: "coding",
        registeredModelId: "model_1",
        modelProvider: "openai",
        modelName: "gpt-4.1",
        modelVersion: "2026-08-01",
        tokenUsage: 12_000,
        costUsd: 1.25,
        status: "completed",
      },
      { id: "run_1", createdAt: now },
    );

    const lineItem = attributeModelCostFromAgentRun(run);

    expect(lineItem).toEqual({
      category: "model",
      sourceType: "agent_run",
      sourceId: "run_1",
      label: "coding run (gpt-4.1)",
      costUsd: 1.25,
      tokens: 12_000,
    });
  });

  it("attributes build cost from completed build and test tool calls", () => {
    const buildCall = createToolCall(
      {
        organizationId: "org_123",
        agentRunId: "run_1",
        toolName: "build.run",
        argumentsRedacted: { target: "app" },
        idempotencyKey: "build_1",
        decision: "allowed",
        status: "completed",
        evidenceRef: "artifacts/build.log",
      },
      { id: "tool_1", createdAt: now },
    );

    expect(attributeBuildCostFromToolCall(buildCall)?.costUsd).toBe(0.15);
  });

  it("attributes sandbox cost from execution session duration", () => {
    const session = createExecutionSession(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        repositoryId: "repo_1",
        sandboxProvider: "fake",
        branch: "feature/onboarding",
        state: "completed",
      },
      { id: "session_1", startedAt: now },
    );

    const lineItem = attributeSandboxCostFromExecutionSession(
      { ...session, endedAt: later },
      later,
    );

    expect(lineItem?.durationMs).toBe(300_000);
    expect(lineItem?.costUsd).toBe(0.25);
  });

  it("aggregates attributed costs by category", () => {
    const aggregated = aggregateCostAttribution({
      organizationId: "org_123",
      workItemId: "work_item_1",
      lineItems: [
        {
          category: "model",
          sourceType: "agent_run",
          sourceId: "run_1",
          label: "coding run",
          costUsd: 1.25,
          tokens: 12_000,
        },
        {
          category: "build",
          sourceType: "tool_call",
          sourceId: "tool_1",
          label: "build.run",
          costUsd: 0.15,
        },
        {
          category: "sandbox",
          sourceType: "execution_session",
          sourceId: "session_1",
          label: "Sandbox session",
          costUsd: 0.25,
          durationMs: 300_000,
        },
      ],
    });

    expect(aggregated.totalCostUsd).toBe(1.65);
    expect(aggregated.modelCostUsd).toBe(1.25);
    expect(aggregated.buildCostUsd).toBe(0.15);
    expect(aggregated.sandboxCostUsd).toBe(0.25);
  });

  it("creates a tenant-scoped cost attribution record", () => {
    const lineItems = [
      {
        category: "model" as const,
        sourceType: "agent_run" as const,
        sourceId: "run_1",
        label: "coding run",
        costUsd: 1.25,
        tokens: 12_000,
      },
      {
        category: "build" as const,
        sourceType: "tool_call" as const,
        sourceId: "tool_1",
        label: "build.run",
        costUsd: 0.15,
      },
      {
        category: "sandbox" as const,
        sourceType: "execution_session" as const,
        sourceId: "session_1",
        label: "Sandbox session",
        costUsd: 0.25,
        durationMs: 300_000,
      },
    ];

    const record = createCostAttributionRecord(
      {
        organizationId: "org_123",
        workItemId: "work_item_1",
        totalCostUsd: 1.65,
        modelCostUsd: 1.25,
        buildCostUsd: 0.15,
        sandboxCostUsd: 0.25,
        lineItems,
      },
      { id: "cost_attr_1", attributedAt: now },
    );

    expect(record.organizationId).toBe("org_123");
    expect(record.workItemId).toBe("work_item_1");
  });
});
