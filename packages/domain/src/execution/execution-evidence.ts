export interface ExecutionDiff {
  path: string;
  before: string;
  after: string;
}

export interface ExecutionEvidence {
  id: string;
  organizationId: string;
  executionSessionId: string;
  agentRunId: string;
  workItemId: string;
  branchName: string;
  commitId: string;
  changedPaths: string[];
  diffs: ExecutionDiff[];
  toolCallEvidenceRefs: string[];
  capturedAt: Date;
}

export interface CreateExecutionEvidenceInput {
  organizationId: string;
  executionSessionId: string;
  agentRunId: string;
  workItemId: string;
  branchName: string;
  commitId: string;
  changedPaths: string[];
  diffs: ExecutionDiff[];
  toolCallEvidenceRefs: string[];
}

export interface CreateExecutionEvidenceMetadata {
  id: string;
  capturedAt: Date;
}

function normalizePathList(paths: string[]): string[] {
  return paths.map((path) => path.trim()).filter((path) => path.length > 0);
}

function normalizeExecutionDiffs(diffs: ExecutionDiff[]): ExecutionDiff[] {
  return diffs.map((diff) => ({
    path: diff.path.trim(),
    before: diff.before,
    after: diff.after,
  }));
}

export function createExecutionEvidence(
  input: CreateExecutionEvidenceInput,
  metadata: CreateExecutionEvidenceMetadata,
): ExecutionEvidence {
  const organizationId = input.organizationId.trim();
  const executionSessionId = input.executionSessionId.trim();
  const agentRunId = input.agentRunId.trim();
  const workItemId = input.workItemId.trim();
  const branchName = input.branchName.trim();
  const commitId = input.commitId.trim();
  const changedPaths = normalizePathList(input.changedPaths);
  const diffs = normalizeExecutionDiffs(input.diffs);
  const toolCallEvidenceRefs = normalizePathList(input.toolCallEvidenceRefs);

  if (
    organizationId.length === 0 ||
    executionSessionId.length === 0 ||
    agentRunId.length === 0 ||
    workItemId.length === 0
  ) {
    throw new Error("Execution evidence identifiers are required");
  }

  if (branchName.length === 0 || commitId.length === 0) {
    throw new Error("Execution evidence branch and commit are required");
  }

  if (changedPaths.length === 0) {
    throw new Error("Execution evidence changed paths are required");
  }

  const evidence: ExecutionEvidence = {
    id: metadata.id,
    organizationId,
    executionSessionId,
    agentRunId,
    workItemId,
    branchName,
    commitId,
    changedPaths,
    diffs,
    toolCallEvidenceRefs,
    capturedAt: metadata.capturedAt,
  };

  validateExecutionEvidence(evidence);

  return evidence;
}

export function validateExecutionEvidence(evidence: ExecutionEvidence): void {
  if (evidence.branchName.trim().length === 0 || evidence.commitId.trim().length === 0) {
    throw new Error("Execution evidence branch and commit are required");
  }

  if (evidence.changedPaths.length === 0) {
    throw new Error("Execution evidence changed paths are required");
  }

  for (const diff of evidence.diffs) {
    if (diff.path.trim().length === 0) {
      throw new Error("Execution diff path is required");
    }

    if (!evidence.changedPaths.includes(diff.path)) {
      throw new Error("Execution diff path must reference a changed path");
    }
  }
}

export interface BuildExecutionEvidenceInput {
  organizationId: string;
  executionSessionId: string;
  agentRunId: string;
  workItemId: string;
  branchName: string;
  commitId: string;
  changedPaths: string[];
  diffs: ExecutionDiff[];
  toolCallEvidenceRefs: string[];
}

export function buildExecutionEvidenceInput(
  input: BuildExecutionEvidenceInput,
): CreateExecutionEvidenceInput {
  return {
    organizationId: input.organizationId,
    executionSessionId: input.executionSessionId,
    agentRunId: input.agentRunId,
    workItemId: input.workItemId,
    branchName: input.branchName,
    commitId: input.commitId,
    changedPaths: input.changedPaths,
    diffs: input.diffs,
    toolCallEvidenceRefs: input.toolCallEvidenceRefs,
  };
}
