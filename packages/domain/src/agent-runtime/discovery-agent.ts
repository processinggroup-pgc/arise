import type { AgentRunBudget, AgentRunContextItem, AgentRunInputContract } from "./agent-run-contracts.js";
import { createAgentRunInputContract } from "./agent-run-contracts.js";
import type { RepositoryDependency } from "../repository-intelligence/repository-dependency.js";
import type { RepositoryFile } from "../repository-intelligence/repository-file.js";
import type { RepositorySymbol } from "../repository-intelligence/repository-symbol.js";
import type { RepositoryTestMapEntry } from "../repository-intelligence/repository-test-map.js";

export const DISCOVERY_AGENT_ROLE = "Discovery Agent";
export const DISCOVERY_OUTPUT_SCHEMA_REF = "schemas/discovery-output.schema.json";

export const DISCOVERY_AGENT_ALLOWED_TOOLS = [
  "repository.read_file",
  "repository.search",
] as const;

export const DISCOVERY_AGENT_WRITE_TOOLS = [
  "repository.write_file",
  "repository.diff",
  "git.create_branch",
  "git.commit",
  "test.run",
  "build.run",
  "migration.validate",
  "github.open_pull_request",
  "github.read_checks",
  "vercel.create_preview",
  "vercel.read_deployment",
  "supabase.create_preview_branch",
  "supabase.validate_schema",
] as const;

export const DISCOVERY_AGENT_DEFAULT_BUDGET: AgentRunBudget = {
  maxActions: 25,
  maxCostUsd: 5,
  maxTokens: 32_000,
};

export interface DiscoveryMapFileEntry {
  path: string;
  language: string;
  symbolCount: number;
  dependencyCount: number;
  hasTests: boolean;
}

export interface DiscoveryMapSymbolEntry {
  path: string;
  name: string;
  kind: string;
  line: number;
}

export interface DiscoveryMapDependencyEntry {
  sourcePath: string;
  target: string;
  kind: string;
  line: number;
}

export interface DiscoveryMapTestEntry {
  testPath: string;
  testedPath: string;
}

export interface DiscoveryRepositoryMap {
  repositoryId: string;
  fileCount: number;
  symbolCount: number;
  dependencyCount: number;
  testMapCount: number;
  files: DiscoveryMapFileEntry[];
  symbols: DiscoveryMapSymbolEntry[];
  dependencies: DiscoveryMapDependencyEntry[];
  testMaps: DiscoveryMapTestEntry[];
}

export interface DiscoveryAssessmentEvidence {
  summary: string;
  observedRisks: string[];
  contextItemCount: number;
  containsPromptInjection: boolean;
  seedFilePaths: string[];
}

export interface DiscoveryAgentOutput {
  schemaRef: string;
  workItemId: string;
  agentRunId: string;
  repositoryMap: DiscoveryRepositoryMap;
  assessmentEvidence: DiscoveryAssessmentEvidence;
  generatedAt: string;
}

export interface BuildDiscoveryRepositoryMapInput {
  repositoryId: string;
  files: RepositoryFile[];
  symbols: RepositorySymbol[];
  dependencies: RepositoryDependency[];
  testMaps: RepositoryTestMapEntry[];
}

export interface CreateDiscoveryAgentOutputInput {
  workItemId: string;
  agentRunId: string;
  repositoryMap: DiscoveryRepositoryMap;
  assessmentEvidence: DiscoveryAssessmentEvidence;
}

export interface CreateDiscoveryAgentOutputMetadata {
  generatedAt: Date;
}

export function assertDiscoveryAgentToolsAreReadOnly(tools: readonly string[]): void {
  for (const tool of tools) {
    if ((DISCOVERY_AGENT_WRITE_TOOLS as readonly string[]).includes(tool)) {
      throw new Error("Discovery Agent cannot use write or execution tools");
    }
  }
}

export function buildDiscoveryAgentInputContract(
  workItemId: string,
  contextItems: AgentRunContextItem[],
  budget: AgentRunBudget = DISCOVERY_AGENT_DEFAULT_BUDGET,
): AgentRunInputContract {
  assertDiscoveryAgentToolsAreReadOnly(DISCOVERY_AGENT_ALLOWED_TOOLS);

  return createAgentRunInputContract({
    role: DISCOVERY_AGENT_ROLE,
    workItemId,
    outputSchemaRef: DISCOVERY_OUTPUT_SCHEMA_REF,
    allowedTools: [...DISCOVERY_AGENT_ALLOWED_TOOLS],
    budget,
    contextItems,
  });
}

export function buildDiscoveryRepositoryMap(
  input: BuildDiscoveryRepositoryMapInput,
): DiscoveryRepositoryMap {
  const fileById = new Map(input.files.map((file) => [file.id, file]));
  const symbolsByFileId = new Map<string, RepositorySymbol[]>();
  const dependenciesByFileId = new Map<string, RepositoryDependency[]>();

  for (const symbol of input.symbols) {
    const current = symbolsByFileId.get(symbol.fileId) ?? [];
    current.push(symbol);
    symbolsByFileId.set(symbol.fileId, current);
  }

  for (const dependency of input.dependencies) {
    const current = dependenciesByFileId.get(dependency.sourceFileId) ?? [];
    current.push(dependency);
    dependenciesByFileId.set(dependency.sourceFileId, current);
  }

  const testedFilePaths = new Set(input.testMaps.map((entry) => entry.testedFilePath));

  const files = [...input.files]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => ({
      path: file.path,
      language: file.language,
      symbolCount: symbolsByFileId.get(file.id)?.length ?? 0,
      dependencyCount: dependenciesByFileId.get(file.id)?.length ?? 0,
      hasTests: testedFilePaths.has(file.path),
    }));

  const symbols: DiscoveryMapSymbolEntry[] = [];
  for (const symbol of input.symbols) {
    const file = fileById.get(symbol.fileId);
    if (file === undefined) {
      continue;
    }

    symbols.push({
      path: file.path,
      name: symbol.name,
      kind: symbol.kind,
      line: symbol.line,
    });
  }
  symbols.sort((left, right) => {
    const pathCompare = left.path.localeCompare(right.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }

    return left.line - right.line;
  });

  const dependencies: DiscoveryMapDependencyEntry[] = [];
  for (const dependency of input.dependencies) {
    const file = fileById.get(dependency.sourceFileId);
    if (file === undefined) {
      continue;
    }

    dependencies.push({
      sourcePath: file.path,
      target: dependency.target,
      kind: dependency.kind,
      line: dependency.line,
    });
  }
  dependencies.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));

  const testMaps: DiscoveryMapTestEntry[] = [];
  for (const entry of input.testMaps) {
    const testFile = fileById.get(entry.testFileId);
    if (testFile === undefined) {
      continue;
    }

    testMaps.push({
      testPath: testFile.path,
      testedPath: entry.testedFilePath,
    });
  }
  testMaps.sort((left, right) => left.testPath.localeCompare(right.testPath));

  return {
    repositoryId: input.repositoryId,
    fileCount: files.length,
    symbolCount: symbols.length,
    dependencyCount: dependencies.length,
    testMapCount: testMaps.length,
    files,
    symbols,
    dependencies,
    testMaps,
  };
}

export function buildDiscoveryAssessmentEvidence(input: {
  repositoryMap: DiscoveryRepositoryMap;
  contextItemCount: number;
  containsPromptInjection: boolean;
  seedFilePaths: string[];
  injectionPatternIds?: string[];
}): DiscoveryAssessmentEvidence {
  const summary = `Indexed ${String(input.repositoryMap.fileCount)} files with ${String(input.repositoryMap.symbolCount)} symbols, ${String(input.repositoryMap.dependencyCount)} dependencies, and ${String(input.repositoryMap.testMapCount)} test mappings.`;

  const observedRisks: string[] = [];
  if (input.containsPromptInjection) {
    observedRisks.push("Repository context contains prompt injection patterns");
  }

  for (const patternId of input.injectionPatternIds ?? []) {
    observedRisks.push(`Prompt injection pattern detected: ${patternId}`);
  }

  if (input.repositoryMap.fileCount === 0) {
    observedRisks.push("Repository index is empty");
  }

  return {
    summary,
    observedRisks,
    contextItemCount: input.contextItemCount,
    containsPromptInjection: input.containsPromptInjection,
    seedFilePaths: [...input.seedFilePaths],
  };
}

export function createDiscoveryAgentOutput(
  input: CreateDiscoveryAgentOutputInput,
  metadata: CreateDiscoveryAgentOutputMetadata,
): DiscoveryAgentOutput {
  const workItemId = input.workItemId.trim();
  const agentRunId = input.agentRunId.trim();

  if (workItemId.length === 0 || agentRunId.length === 0) {
    throw new Error("Discovery output identifiers are required");
  }

  if (input.assessmentEvidence.summary.trim().length === 0) {
    throw new Error("Discovery assessment summary is required");
  }

  const output: DiscoveryAgentOutput = {
    schemaRef: DISCOVERY_OUTPUT_SCHEMA_REF,
    workItemId,
    agentRunId,
    repositoryMap: input.repositoryMap,
    assessmentEvidence: input.assessmentEvidence,
    generatedAt: metadata.generatedAt.toISOString(),
  };

  validateDiscoveryAgentOutput(output);

  return output;
}

export function validateDiscoveryAgentOutput(output: DiscoveryAgentOutput): void {
  if (output.schemaRef !== DISCOVERY_OUTPUT_SCHEMA_REF) {
    throw new Error("Discovery output schema reference is invalid");
  }

  if (output.workItemId.length === 0 || output.agentRunId.length === 0) {
    throw new Error("Discovery output identifiers are required");
  }

  if (output.generatedAt.length === 0) {
    throw new Error("Discovery output timestamp is required");
  }

  if (output.assessmentEvidence.summary.trim().length === 0) {
    throw new Error("Discovery assessment summary is required");
  }

  const map = output.repositoryMap;
  if (map.repositoryId.length === 0) {
    throw new Error("Discovery repository map identifier is required");
  }

  if (
    map.fileCount !== map.files.length ||
    map.symbolCount !== map.symbols.length ||
    map.dependencyCount !== map.dependencies.length ||
    map.testMapCount !== map.testMaps.length
  ) {
    throw new Error("Discovery repository map counts are inconsistent");
  }
}
