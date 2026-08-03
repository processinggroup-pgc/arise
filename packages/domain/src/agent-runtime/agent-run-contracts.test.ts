import { describe, expect, it } from "vitest";

import { createAgentRunInputContract, createToolActionEnvelope } from "./agent-run-contracts.js";

describe("agent run contracts", () => {
  it("requires role, tools, budget and output schema", () => {
    const contract = createAgentRunInputContract({
      role: "Discovery Agent",
      workItemId: "work_item_1",
      outputSchemaRef: "schemas/discovery-output.schema.json",
      allowedTools: ["repository.read_file", "repository.search"],
      budget: {
        maxActions: 25,
        maxCostUsd: 5,
        maxTokens: 32_000,
      },
      contextItems: [
        {
          sourceType: "repository_file",
          sourceRef: "packages/domain/src/index.ts",
          trustLevel: "untrusted",
          contentHash: "hash_1",
          rank: 1,
        },
      ],
    });

    expect(contract.allowedTools).toEqual(["repository.read_file", "repository.search"]);
    expect(contract.budget.maxCostUsd).toBe(5);
  });

  it("rejects elevated trust on repository context", () => {
    expect(() => {
      createAgentRunInputContract({
        role: "Architecture Agent",
        workItemId: "work_item_1",
        outputSchemaRef: "schemas/architecture-output.schema.json",
        allowedTools: ["repository.read_file"],
        budget: {
          maxActions: 10,
          maxCostUsd: 2,
          maxTokens: 16_000,
        },
        contextItems: [
          {
            sourceType: "repository_file",
            sourceRef: "README.md",
            trustLevel: "trusted",
            contentHash: "hash_2",
            rank: 1,
          },
        ],
      });
    }).toThrow("Repository context cannot alter policy or tool trust boundaries");
  });

  it("builds a typed tool action envelope", () => {
    const envelope = createToolActionEnvelope(
      {
        tenantId: "org_123",
        workItemId: "work_item_1",
        agentRunId: "run_1",
        tool: "repository.read_file",
        purpose: "Inspect repository entrypoint",
        expectedEffect: "Return file contents for analysis",
        riskClass: "green",
        idempotencyKey: "read-index-ts",
      },
      { actionId: "action_1" },
    );

    expect(envelope.tool).toBe("repository.read_file");
    expect(envelope.riskClass).toBe("green");
  });
});
