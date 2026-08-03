import {
  createPromptInjectionFinding,
  detectPromptInjectionInContent,
  type PromptInjectionFinding,
  type TenantContext,
} from "@arise/domain";
import type { GitHubRepositoryContentPort } from "@arise/integration-github";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { RepositoryStore } from "../repository/repository-store.js";
import { RepositoryScopeError } from "./index-repository.js";

export interface ScanRepositoryPromptInjectionCommand {
  tenantContext: TenantContext;
  repositoryId: string;
}

export interface ScanRepositoryPromptInjectionResult {
  findings: PromptInjectionFinding[];
  scannedFileCount: number;
}

function parseRepositoryFullName(fullName: string): { owner: string; name: string } {
  const [owner = "", name = ""] = fullName.split("/");
  return { owner, name };
}

export async function scanRepositoryForPromptInjection(
  command: ScanRepositoryPromptInjectionCommand,
  repositoryStore: RepositoryStore,
  contentPort: GitHubRepositoryContentPort,
  context: IdentityOperationContext,
): Promise<ScanRepositoryPromptInjectionResult> {
  const repository = await repositoryStore.findRepositoryById(command.repositoryId);
  if (repository === undefined) {
    throw new RepositoryScopeError("Repository was not found");
  }

  if (repository.organizationId !== command.tenantContext.organizationId) {
    throw new RepositoryScopeError("Repository is outside the tenant scope");
  }

  const { owner, name } = parseRepositoryFullName(repository.fullName);
  const remoteFiles = await contentPort.listRepositoryFiles({
    installationId: repository.installationId,
    owner,
    name,
  });

  const findings: PromptInjectionFinding[] = [];

  for (const file of remoteFiles) {
    for (const match of detectPromptInjectionInContent(file.content, file.path)) {
      findings.push(
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
    findings,
    scannedFileCount: remoteFiles.length,
  };
}
