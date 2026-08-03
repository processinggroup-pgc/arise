export interface RepositoryTestMapEntry {
  id: string;
  organizationId: string;
  repositoryId: string;
  testFileId: string;
  testedFilePath: string;
  indexedAt: Date;
}

export interface CreateRepositoryTestMapEntryInput {
  organizationId: string;
  repositoryId: string;
  testFileId: string;
  testedFilePath: string;
}

export interface CreateRepositoryTestMapEntryMetadata {
  id: string;
  indexedAt: Date;
}

const TEST_FILE_PATTERN = /\.(test|spec)\.(tsx?|jsx?|mjs)$/u;

export function isTestFilePath(path: string): boolean {
  return TEST_FILE_PATTERN.test(path.trim());
}

export function inferTestedFilePath(testPath: string): string | null {
  const normalized = testPath.trim().replace(/\\/gu, "/");
  const match = /^(?<base>.+)\.(?<kind>test|spec)\.(?<ext>tsx?|jsx?|mjs)$/u.exec(normalized);

  const base = match?.groups?.["base"];
  const ext = match?.groups?.["ext"];

  if (base === undefined || ext === undefined) {
    return null;
  }

  return `${base}.${ext}`;
}

export function createRepositoryTestMapEntry(
  input: CreateRepositoryTestMapEntryInput,
  metadata: CreateRepositoryTestMapEntryMetadata,
): RepositoryTestMapEntry {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const testFileId = input.testFileId.trim();
  const testedFilePath = input.testedFilePath.trim().replace(/\\/gu, "/");

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (repositoryId.length === 0) {
    throw new Error("Repository identifier is required");
  }

  if (testFileId.length === 0) {
    throw new Error("Repository test file identifier is required");
  }

  if (testedFilePath.length === 0) {
    throw new Error("Repository tested file path is required");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    testFileId,
    testedFilePath,
    indexedAt: metadata.indexedAt,
  };
}
