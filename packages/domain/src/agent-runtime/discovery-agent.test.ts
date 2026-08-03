import { describe, expect, it } from "vitest";

import { createRepositoryDependency } from "../repository-intelligence/repository-dependency.js";
import { createRepositoryFile } from "../repository-intelligence/repository-file.js";
import { createRepositorySymbol } from "../repository-intelligence/repository-symbol.js";
import { createRepositoryTestMapEntry } from "../repository-intelligence/repository-test-map.js";
import {
  assertDiscoveryAgentToolsAreReadOnly,
  buildDiscoveryAgentInputContract,
  buildDiscoveryAssessmentEvidence,
  buildDiscoveryRepositoryMap,
  createDiscoveryAgentOutput,
  DISCOVERY_AGENT_ALLOWED_TOOLS,
  DISCOVERY_OUTPUT_SCHEMA_REF,
} from "./discovery-agent.js";

const indexedAt = new Date("2026-08-03T12:00:00.000Z");

describe("discovery agent", () => {
  it("restricts Discovery Agent to read-only repository tools", () => {
    expect([...DISCOVERY_AGENT_ALLOWED_TOOLS]).toEqual([
      "repository.read_file",
      "repository.search",
    ]);

    expect(() => {
      assertDiscoveryAgentToolsAreReadOnly(["repository.read_file", "repository.write_file"]);
    }).toThrow("Discovery Agent cannot use write or execution tools");
  });

  it("builds a repository map from indexed files, symbols, dependencies and tests", () => {
    const routeFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_1",
        path: "src/memberships/route.ts",
        language: "typescript",
        contentHash: "hash_route",
      },
      { id: "file_route", indexedAt },
    );
    const serviceFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_1",
        path: "src/memberships/service.ts",
        language: "typescript",
        contentHash: "hash_service",
      },
      { id: "file_service", indexedAt },
    );
    const testFile = createRepositoryFile(
      {
        organizationId: "org_123",
        repositoryId: "repo_1",
        path: "src/memberships/route.test.ts",
        language: "typescript",
        contentHash: "hash_test",
      },
      { id: "file_test", indexedAt },
    );

    const symbols = [
      createRepositorySymbol(
        {
          organizationId: "org_123",
          repositoryId: "repo_1",
          fileId: routeFile.id,
          name: "listMemberships",
          kind: "function",
          line: 2,
        },
        { id: "symbol_1", indexedAt },
      ),
      createRepositorySymbol(
        {
          organizationId: "org_123",
          repositoryId: "repo_1",
          fileId: serviceFile.id,
          name: "MembershipService",
          kind: "class",
          line: 1,
        },
        { id: "symbol_2", indexedAt },
      ),
    ];

    const dependencies = [
      createRepositoryDependency(
        {
          organizationId: "org_123",
          repositoryId: "repo_1",
          sourceFileId: routeFile.id,
          target: "./service",
          kind: "relative_import",
          line: 1,
        },
        { id: "dep_1", indexedAt },
      ),
    ];

    const testMaps = [
      createRepositoryTestMapEntry(
        {
          organizationId: "org_123",
          repositoryId: "repo_1",
          testFileId: testFile.id,
          testedFilePath: "src/memberships/route.ts",
        },
        { id: "test_map_1", indexedAt },
      ),
    ];

    const map = buildDiscoveryRepositoryMap({
      repositoryId: "repo_1",
      files: [routeFile, serviceFile, testFile],
      symbols,
      dependencies,
      testMaps,
    });

    expect(map.fileCount).toBe(3);
    expect(map.symbolCount).toBe(2);
    expect(map.dependencyCount).toBe(1);
    expect(map.testMapCount).toBe(1);
    expect(map.files.find((file) => file.path === "src/memberships/route.ts")?.hasTests).toBe(true);
  });

  it("creates schema-valid discovery output with assessment evidence", () => {
    const repositoryMap = buildDiscoveryRepositoryMap({
      repositoryId: "repo_1",
      files: [],
      symbols: [],
      dependencies: [],
      testMaps: [],
    });
    const assessmentEvidence = buildDiscoveryAssessmentEvidence({
      repositoryMap,
      contextItemCount: 2,
      containsPromptInjection: false,
      seedFilePaths: ["src/index.ts"],
    });

    const output = createDiscoveryAgentOutput(
      {
        workItemId: "work_item_1",
        agentRunId: "run_1",
        repositoryMap,
        assessmentEvidence,
      },
      { generatedAt: indexedAt },
    );

    expect(output.schemaRef).toBe(DISCOVERY_OUTPUT_SCHEMA_REF);
    expect(output.assessmentEvidence.contextItemCount).toBe(2);
  });

  it("builds a discovery input contract with untrusted repository context", () => {
    const contract = buildDiscoveryAgentInputContract("work_item_1", [
      {
        sourceType: "repository_file",
        sourceRef: "src/index.ts",
        trustLevel: "untrusted",
        contentHash: "hash_1",
        rank: 1,
      },
    ]);

    expect(contract.role).toBe("Discovery Agent");
    expect(contract.outputSchemaRef).toBe(DISCOVERY_OUTPUT_SCHEMA_REF);
  });
});
