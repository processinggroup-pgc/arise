export const REPOSITORY_FILE_LANGUAGES = [
  "typescript",
  "javascript",
  "json",
  "markdown",
  "sql",
  "unknown",
] as const;

export type RepositoryFileLanguage = (typeof REPOSITORY_FILE_LANGUAGES)[number];

export interface RepositoryFile {
  id: string;
  organizationId: string;
  repositoryId: string;
  path: string;
  language: RepositoryFileLanguage;
  contentHash: string;
  indexedAt: Date;
}

export interface CreateRepositoryFileInput {
  organizationId: string;
  repositoryId: string;
  path: string;
  language: string;
  contentHash: string;
}

export interface CreateRepositoryFileMetadata {
  id: string;
  indexedAt: Date;
}

function assertRepositoryFileLanguage(language: string): RepositoryFileLanguage {
  if (!(REPOSITORY_FILE_LANGUAGES as readonly string[]).includes(language)) {
    throw new Error("Repository file language is invalid");
  }

  return language as RepositoryFileLanguage;
}

export function inferRepositoryFileLanguage(path: string): RepositoryFileLanguage {
  const normalized = path.trim().toLowerCase();

  if (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) {
    return "typescript";
  }

  if (normalized.endsWith(".js") || normalized.endsWith(".jsx") || normalized.endsWith(".mjs")) {
    return "javascript";
  }

  if (normalized.endsWith(".json")) {
    return "json";
  }

  if (normalized.endsWith(".md")) {
    return "markdown";
  }

  if (normalized.endsWith(".sql")) {
    return "sql";
  }

  return "unknown";
}

export function createRepositoryFile(
  input: CreateRepositoryFileInput,
  metadata: CreateRepositoryFileMetadata,
): RepositoryFile {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const path = input.path.trim().replace(/\\/gu, "/");
  const contentHash = input.contentHash.trim();

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (repositoryId.length === 0) {
    throw new Error("Repository identifier is required");
  }

  if (path.length === 0) {
    throw new Error("Repository file path is required");
  }

  if (contentHash.length === 0) {
    throw new Error("Repository file content hash is required");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    path,
    language: assertRepositoryFileLanguage(input.language),
    contentHash,
    indexedAt: metadata.indexedAt,
  };
}
