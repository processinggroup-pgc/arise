export const REPOSITORY_DEPENDENCY_KINDS = ["relative_import", "package_import"] as const;
export type RepositoryDependencyKind = (typeof REPOSITORY_DEPENDENCY_KINDS)[number];

export interface RepositoryDependency {
  id: string;
  organizationId: string;
  repositoryId: string;
  sourceFileId: string;
  target: string;
  kind: RepositoryDependencyKind;
  line: number;
  indexedAt: Date;
}

export interface CreateRepositoryDependencyInput {
  organizationId: string;
  repositoryId: string;
  sourceFileId: string;
  target: string;
  kind: string;
  line: number;
}

export interface CreateRepositoryDependencyMetadata {
  id: string;
  indexedAt: Date;
}

function assertRepositoryDependencyKind(kind: string): RepositoryDependencyKind {
  if (!(REPOSITORY_DEPENDENCY_KINDS as readonly string[]).includes(kind)) {
    throw new Error("Repository dependency kind is invalid");
  }

  return kind as RepositoryDependencyKind;
}

export function createRepositoryDependency(
  input: CreateRepositoryDependencyInput,
  metadata: CreateRepositoryDependencyMetadata,
): RepositoryDependency {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const sourceFileId = input.sourceFileId.trim();
  const target = input.target.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (repositoryId.length === 0) {
    throw new Error("Repository identifier is required");
  }

  if (sourceFileId.length === 0) {
    throw new Error("Repository source file identifier is required");
  }

  if (target.length === 0) {
    throw new Error("Repository dependency target is required");
  }

  if (!Number.isInteger(input.line) || input.line < 1) {
    throw new Error("Repository dependency line must be a positive integer");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    sourceFileId,
    target,
    kind: assertRepositoryDependencyKind(input.kind),
    line: input.line,
    indexedAt: metadata.indexedAt,
  };
}
