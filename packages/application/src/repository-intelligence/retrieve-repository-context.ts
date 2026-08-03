import { createHash } from "node:crypto";

import {
  assertRepositoryContextTrustIsNotElevated,
  createPromptInjectionFinding,
  createRetrievedContextItem,
  detectPromptInjectionInContent,
  REPOSITORY_CONTEXT_TRUST_LEVEL,
  selectRepositoryContext,
  sortRetrievedContextItems,
  type PromptInjectionFinding,
  type RetrievedContextItem,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import { RepositoryScopeError } from "./index-repository.js";
import type { RepositoryIndexStore } from "./repository-index-store.js";

export interface RetrieveRepositoryContextCommand {
  tenantContext: TenantContext;
  repositoryId: string;
  seedFilePaths: string[];
  maxItems?: number;
}

export interface RetrieveRepositoryContextResult {
  items: RetrievedContextItem[];
  injectionFindings: PromptInjectionFinding[];
  containsPromptInjection: boolean;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function parseRepositoryFullName(fullName: string): { owner: string; name: string } {
  const [owner = "", name = ""] = fullName.split("/");
  return { owner, name };
}

export async function retrieveRepositoryContext(
  command: RetrieveRepositoryContextCommand,
  repositoryStore: RepositoryStore,
  repositoryIndexStore: RepositoryIndexStore,
  contentPort: GitHubRepositoryContentPort,
  context: IdentityOperationContext,
): Promise<RetrieveRepositoryContextResult> {
  const repository = await repositoryStore.findRepositoryById(command.repositoryId);
  if (repository === undefined) {
    throw new RepositoryScopeError("Repository was not found");
  }

  if (repository.organizationId !== command.tenantContext.organizationId) {
    throw new RepositoryScopeError("Repository is outside the tenant scope");
  }

  const files = await repositoryIndexStore.listFilesForRepository(repository.id);
  const symbols = await repositoryIndexStore.listSymbolsForRepository(repository.id);
  const dependencies = await repositoryIndexStore.listDependenciesForRepository(repository.id);
  const testMaps = await repositoryIndexStore.listTestMapsForRepository(repository.id);

  const selection = selectRepositoryContext({
    seedFilePaths: command.seedFilePaths,
    files,
    symbols,
    dependencies,
    testMaps,
    maxItems: command.maxItems ?? 10,
  });

  const { owner, name } = parseRepositoryFullName(repository.fullName);
  const remoteFiles = await contentPort.listRepositoryFiles({
    installationId: repository.installationId,
    owner,
    name,
  });
  const contentByPath = new Map(remoteFiles.map((file) => [file.path, file.content]));

  const items: RetrievedContextItem[] = [];

  for (const selectedFile of selection.files) {
    const content = contentByPath.get(selectedFile.path);
    if (content === undefined) {
      continue;
    }

    items.push(
      createRetrievedContextItem(
        {
          organizationId: repository.organizationId,
          repositoryId: repository.id,
          sourceType: "repository_file",
          sourceRef: selectedFile.path,
          trustLevel: REPOSITORY_CONTEXT_TRUST_LEVEL,
          contentHash: hashContent(content),
          rank: selectedFile.rank,
          label: selectedFile.reason,
          content,
        },
        { id: context.createId() },
      ),
    );
  }

  for (const symbol of selection.symbols) {
    const file = files.find((entry) => entry.id === symbol.fileId);
    if (file === undefined) {
      continue;
    }

    const selectedFile = selection.files.find((entry) => entry.path === file.path);
    if (selectedFile === undefined) {
      continue;
    }

    const symbolContent = `${symbol.kind} ${symbol.name} at line ${String(symbol.line)}`;
    items.push(
      createRetrievedContextItem(
        {
          organizationId: repository.organizationId,
          repositoryId: repository.id,
          sourceType: "repository_symbol",
          sourceRef: `${file.path}#${symbol.name}:${String(symbol.line)}`,
          trustLevel: REPOSITORY_CONTEXT_TRUST_LEVEL,
          contentHash: hashContent(symbolContent),
          rank: selectedFile.rank,
          label: `symbol in ${file.path}`,
          content: symbolContent,
        },
        { id: context.createId() },
      ),
    );
  }

  assertRepositoryContextTrustIsNotElevated(items);

  const injectionFindings: PromptInjectionFinding[] = [];
  for (const item of items) {
    if (item.sourceType !== "repository_file") {
      continue;
    }

    for (const match of detectPromptInjectionInContent(item.content, item.sourceRef)) {
      injectionFindings.push(
        createPromptInjectionFinding(
          {
            organizationId: repository.organizationId,
            repositoryId: repository.id,
            sourceRef: match.sourceRef,
            line: match.line,
            matchedText: match.matchedText,
            patternId: match.patternId,
            description: match.description,
          },
          { id: context.createId() },
        ),
      );
    }
  }

  return {
    items: sortRetrievedContextItems(items),
    injectionFindings,
    containsPromptInjection: injectionFindings.length > 0,
  };
}
