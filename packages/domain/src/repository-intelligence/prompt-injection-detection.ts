export interface PromptInjectionPattern {
  id: string;
  description: string;
  pattern: RegExp;
}

export interface PromptInjectionMatch {
  sourceRef: string;
  line: number;
  matchedText: string;
  patternId: string;
  description: string;
}

export interface PromptInjectionFinding {
  id: string;
  organizationId: string;
  repositoryId: string;
  sourceRef: string;
  line: number;
  matchedText: string;
  patternId: string;
  description: string;
}

export interface CreatePromptInjectionFindingInput {
  organizationId: string;
  repositoryId: string;
  sourceRef: string;
  line: number;
  matchedText: string;
  patternId: string;
  description: string;
}

export interface CreatePromptInjectionFindingMetadata {
  id: string;
}

export const PLATFORM_PROMPT_INJECTION_PATTERNS: PromptInjectionPattern[] = [
  {
    id: "platform.prompt_injection.ignore_instructions",
    description: "Attempts to override prior instructions",
    pattern: /\bignore (all )?(previous|prior|above) instructions\b/iu,
  },
  {
    id: "platform.prompt_injection.disregard_system_prompt",
    description: "Attempts to disregard the system prompt",
    pattern: /\bdisregard (the )?(system|developer) (prompt|message|instructions)\b/iu,
  },
  {
    id: "platform.prompt_injection.role_override",
    description: "Attempts to redefine the assistant role",
    pattern: /\byou are now (a |an )?[a-z][a-z\s-]{2,40}\b/iu,
  },
  {
    id: "platform.prompt_injection.policy_override",
    description: "Attempts to override platform policies",
    pattern: /\b(override|bypass|disable) (the )?(security|policy|rls|audit)\b/iu,
  },
  {
    id: "platform.prompt_injection.tool_permission_change",
    description: "Attempts to modify tool permissions",
    pattern:
      /\b(grant|enable|allow) (yourself|agents|tools?) (admin|root|write|execute|elevated)\b/iu,
  },
  {
    id: "platform.prompt_injection.secret_exfiltration",
    description: "Attempts to exfiltrate secrets or credentials",
    pattern: /\b(exfiltrate|send|print|dump) (all )?(secrets|credentials|api keys|tokens)\b/iu,
  },
];

export function detectPromptInjectionInContent(
  content: string,
  sourceRef: string,
  patterns: PromptInjectionPattern[] = PLATFORM_PROMPT_INJECTION_PATTERNS,
): PromptInjectionMatch[] {
  const normalizedSourceRef = sourceRef.trim();
  if (normalizedSourceRef.length === 0) {
    throw new Error("Prompt injection source reference is required");
  }

  const lines = content.split(/\r?\n/u);
  const findings: PromptInjectionMatch[] = [];
  const seen = new Set<string>();

  for (const [index, line] of lines.entries()) {
    for (const entry of patterns) {
      const match = entry.pattern.exec(line);
      if (match === null) {
        continue;
      }

      const matchedText = match[0].trim();
      const dedupeKey = `${normalizedSourceRef}:${String(index + 1)}:${entry.id}:${matchedText}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      findings.push({
        sourceRef: normalizedSourceRef,
        line: index + 1,
        matchedText,
        patternId: entry.id,
        description: entry.description,
      });
    }
  }

  return findings;
}

export function createPromptInjectionFinding(
  input: CreatePromptInjectionFindingInput,
  metadata: CreatePromptInjectionFindingMetadata,
): PromptInjectionFinding {
  const organizationId = input.organizationId.trim();
  const repositoryId = input.repositoryId.trim();
  const sourceRef = input.sourceRef.trim();
  const matchedText = input.matchedText.trim();
  const patternId = input.patternId.trim();
  const description = input.description.trim();

  if (
    organizationId.length === 0 ||
    repositoryId.length === 0 ||
    sourceRef.length === 0 ||
    matchedText.length === 0 ||
    patternId.length === 0 ||
    description.length === 0
  ) {
    throw new Error("Prompt injection finding fields are required");
  }

  if (!Number.isInteger(input.line) || input.line < 1) {
    throw new Error("Prompt injection finding line must be a positive integer");
  }

  return {
    id: metadata.id,
    organizationId,
    repositoryId,
    sourceRef,
    line: input.line,
    matchedText,
    patternId,
    description,
  };
}

export function assertRepositoryContextTrustIsNotElevated(
  items: Array<{ sourceType: string; trustLevel: string }>,
): void {
  for (const item of items) {
    if (item.sourceType.startsWith("repository_") && item.trustLevel !== "untrusted") {
      throw new Error("Repository context cannot alter policy or tool trust boundaries");
    }
  }
}
