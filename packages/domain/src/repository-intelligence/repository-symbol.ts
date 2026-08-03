export const REPOSITORY_SYMBOL_KINDS = [
  "function",
  "class",
  "interface",
  "type",
  "variable",
] as const;

export type RepositorySymbolKind = (typeof REPOSITORY_SYMBOL_KINDS)[number];

export interface RepositorySymbol {
  id: string;
  organizationId: string;
  repositoryId: string;
  fileId: string;
  name: string;
  kind: RepositorySymbolKind;
  line: number;
  indexedAt: Date;
}

export interface CreateRepositorySymbolInput {
  organizationId: string;
  repositoryId: string;
  fileId: string;
  name: string;
  kind: string;
  line: number;
}

export interface CreateRepositorySymbolMetadata {
  id: string;
  indexedAt: Date;
}

function assertRepositorySymbolKind(kind: string): RepositorySymbolKind {
  if (!(REPOSITORY_SYMBOL_KINDS as readonly string[]).includes(kind)) {
    throw new Error("Repository symbol kind is invalid");
  }

  return kind as RepositorySymbolKind;
}

export function createRepositorySymbol(
  input: CreateRepositorySymbolInput,
  metadata: CreateRepositorySymbolMetadata,
): RepositorySymbol {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const fileId = input.fileId.trim();
  const name = input.name.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (repositoryId.length === 0) {
    throw new Error("Repository identifier is required");
  }

  if (fileId.length === 0) {
    throw new Error("Repository file identifier is required");
  }

  if (name.length === 0) {
    throw new Error("Repository symbol name is required");
  }

  if (!Number.isInteger(input.line) || input.line < 1) {
    throw new Error("Repository symbol line must be a positive integer");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    fileId,
    name,
    kind: assertRepositorySymbolKind(input.kind),
    line: input.line,
    indexedAt: metadata.indexedAt,
  };
}
