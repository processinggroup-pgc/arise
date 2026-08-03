export const CONTEXT_TRUST_LEVELS = ["trusted", "verified", "untrusted"] as const;
export type ContextTrustLevel = (typeof CONTEXT_TRUST_LEVELS)[number];

export const CONTEXT_SOURCE_TYPES = [
  "repository_file",
  "repository_symbol",
  "repository_dependency",
  "repository_test_map",
] as const;

export type ContextSourceType = (typeof CONTEXT_SOURCE_TYPES)[number];

export const REPOSITORY_CONTEXT_TRUST_LEVEL: ContextTrustLevel = "untrusted";

export interface RetrievedContextItem {
  id: string;
  organizationId: string;
  repositoryId: string;
  sourceType: ContextSourceType;
  sourceRef: string;
  trustLevel: ContextTrustLevel;
  contentHash: string;
  rank: number;
  label: string;
  content: string;
}

export interface CreateRetrievedContextItemInput {
  organizationId: string;
  repositoryId: string;
  sourceType: string;
  sourceRef: string;
  trustLevel: string;
  contentHash: string;
  rank: number;
  label: string;
  content: string;
}

export interface CreateRetrievedContextItemMetadata {
  id: string;
}

function assertContextTrustLevel(trustLevel: string): ContextTrustLevel {
  if (!(CONTEXT_TRUST_LEVELS as readonly string[]).includes(trustLevel)) {
    throw new Error("Context trust level is invalid");
  }

  return trustLevel as ContextTrustLevel;
}

function assertContextSourceType(sourceType: string): ContextSourceType {
  if (!(CONTEXT_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    throw new Error("Context source type is invalid");
  }

  return sourceType as ContextSourceType;
}

function isRepositoryContextSource(sourceType: ContextSourceType): boolean {
  return sourceType.startsWith("repository_");
}

export function createRetrievedContextItem(
  input: CreateRetrievedContextItemInput,
  metadata: CreateRetrievedContextItemMetadata,
): RetrievedContextItem {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const sourceRef = input.sourceRef.trim();
  const contentHash = input.contentHash.trim();
  const label = input.label.trim();
  const content = input.content;

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (repositoryId.length === 0) {
    throw new Error("Repository identifier is required");
  }

  if (sourceRef.length === 0) {
    throw new Error("Context source reference is required");
  }

  if (contentHash.length === 0) {
    throw new Error("Context content hash is required");
  }

  if (label.length === 0) {
    throw new Error("Context label is required");
  }

  if (content.trim().length === 0) {
    throw new Error("Context content is required");
  }

  if (!Number.isInteger(input.rank) || input.rank < 1) {
    throw new Error("Context rank must be a positive integer");
  }

  const sourceType = assertContextSourceType(input.sourceType);
  const trustLevel = assertContextTrustLevel(input.trustLevel);

  if (isRepositoryContextSource(sourceType) && trustLevel !== REPOSITORY_CONTEXT_TRUST_LEVEL) {
    throw new Error("Repository context must be labeled untrusted");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    sourceType,
    sourceRef,
    trustLevel,
    contentHash,
    rank: input.rank,
    label,
    content,
  };
}

export function sortRetrievedContextItems(items: RetrievedContextItem[]): RetrievedContextItem[] {
  return [...items].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return left.sourceRef.localeCompare(right.sourceRef);
  });
}
