import { describe, expect, it } from "vitest";

import { createWorkItem } from "../intent/work-item.js";
import {
  buildDiscoveryAssessmentEvidence,
  buildDiscoveryRepositoryMap,
  createDiscoveryAgentOutput,
} from "./discovery-agent.js";
import {
  buildArchitectureDecisionRecordDraft,
  buildArchitectureAgentInputContract,
  buildArchitectureOptions,
  createArchitectureAgentOutput,
  selectPreferredArchitectureOption,
  ARCHITECTURE_OUTPUT_SCHEMA_REF,
} from "./architecture-agent.js";

const createdAt = new Date("2026-08-03T12:00:00.000Z");

function buildDiscoveryOutput(workItemId: string) {
  const repositoryMap = buildDiscoveryRepositoryMap({
    repositoryId: "repo_1",
    files: [],
    symbols: [],
    dependencies: [],
    testMaps: [],
  });

  return createDiscoveryAgentOutput(
    {
      workItemId,
      agentRunId: "discovery_run_1",
      repositoryMap,
      assessmentEvidence: buildDiscoveryAssessmentEvidence({
        repositoryMap,
        contextItemCount: 1,
        containsPromptInjection: false,
        seedFilePaths: ["src/memberships/route.ts"],
      }),
    },
    { generatedAt: createdAt },
  );
}

describe("architecture agent", () => {
  it("restricts Architecture Agent to read-only repository tools", () => {
    const contract = buildArchitectureAgentInputContract("work_item_1", [
      {
        sourceType: "repository_file",
        sourceRef: "src/memberships/route.ts",
        trustLevel: "untrusted",
        contentHash: "hash_1",
        rank: 1,
      },
    ]);

    expect(contract.role).toBe("Architecture Agent");
    expect(contract.allowedTools).toEqual(["repository.read_file", "repository.search"]);
    expect(contract.outputSchemaRef).toBe(ARCHITECTURE_OUTPUT_SCHEMA_REF);
  });

  it("builds architecture options and a draft decision record from discovery evidence", () => {
    const workItem = createWorkItem(
      {
        projectId: "project_1",
        organizationId: "org_123",
        title: "Improve membership onboarding",
        type: "feature",
        riskLevel: "high",
        ownerId: "user_owner",
        problemStatement: "Membership onboarding is fragmented across modules.",
        targetUser: "Platform engineer",
        desiredBehavior: "Onboarding is orchestrated through one workflow.",
        dataClassification: "internal",
        acceptanceCriteria: [
          {
            given: "Existing membership modules",
            when: "Onboarding is redesigned",
            then: "Modules remain compatible",
          },
        ],
      },
      { id: "work_item_1", lineageId: "lineage_1", version: 1, createdAt },
    );

    let optionCounter = 0;
    const options = buildArchitectureOptions({
      workItem,
      discoveryOutput: buildDiscoveryOutput(workItem.id),
      createId: () => `option_${String(++optionCounter)}`,
    });

    expect(options.length).toBeGreaterThanOrEqual(2);

    const preferred = selectPreferredArchitectureOption(options, workItem);
    expect(preferred.title).toBe("Introduce a boundary module");

    const decisionRecord = buildArchitectureDecisionRecordDraft({
      workItem,
      preferredOption: preferred,
      discoveryOutput: buildDiscoveryOutput(workItem.id),
    });

    const output = createArchitectureAgentOutput(
      {
        workItemId: workItem.id,
        agentRunId: "architecture_run_1",
        discoveryRunId: "discovery_run_1",
        options,
        preferredOptionId: preferred.id,
        decisionRecord,
      },
      { generatedAt: createdAt },
    );

    expect(output.decisionRecord.status).toBe("draft");
    expect(output.preferredOptionId).toBe(preferred.id);
  });

  it("prefers a spike option for spike work items", () => {
    const workItem = createWorkItem(
      {
        projectId: "project_1",
        organizationId: "org_123",
        title: "Evaluate workflow engine",
        type: "spike",
        riskLevel: "medium",
        ownerId: "user_owner",
        problemStatement: "We need to compare workflow orchestration libraries.",
        targetUser: "Architect",
        desiredBehavior: "Select a workflow engine with clear migration path.",
        dataClassification: "internal",
        unresolvedQuestions: [{ question: "Which engine supports durable retries?" }],
        acceptanceCriteria: [
          {
            given: "Existing membership modules",
            when: "Onboarding is redesigned",
            then: "Modules remain compatible",
          },
        ],
      },
      { id: "work_item_spike", lineageId: "lineage_spike", version: 1, createdAt },
    );

    let optionCounter = 0;
    const options = buildArchitectureOptions({
      workItem,
      discoveryOutput: buildDiscoveryOutput(workItem.id),
      createId: () => `option_${String(++optionCounter)}`,
    });

    const preferred = selectPreferredArchitectureOption(options, workItem);
    expect(preferred.title).toBe("Time-boxed spike");
  });
});
