const REDACTION = "[REDACTED]";

const SECRET_REFERENCE_PREFIX = "SECRET_REF:";

const REDACTION_RULES: Array<{ pattern: RegExp; replace: (match: string) => string }> = [
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    replace: () => REDACTION,
  },
  {
    pattern: /ghp_[A-Za-z0-9]{20,}/g,
    replace: () => REDACTION,
  },
  {
    pattern: /github_pat_[A-Za-z0-9_]{20,}/g,
    replace: () => REDACTION,
  },
  {
    pattern: /sk-[A-Za-z0-9]{20,}/g,
    replace: () => REDACTION,
  },
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replace: () => `Bearer ${REDACTION}`,
  },
  {
    pattern: /"(api[_-]?key|password|secret)"\s*:\s*"([^"\\]|\\.)*"/gi,
    replace: (match) => match.replace(/:\s*"([^"\\]|\\.)*"/i, ': "[REDACTED]"'),
  },
  {
    pattern: /\b(api[_-]?key|password|secret)=([^\s"']+)/gi,
    replace: (match) => match.replace(/=([^\s"']+)/, `=${REDACTION}`),
  },
  {
    pattern: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
    replace: () => REDACTION,
  },
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replace: () => REDACTION,
  },
];

function preserveSecretReferences(input: string): string {
  return input.replace(new RegExp(`${SECRET_REFERENCE_PREFIX}[A-Z0-9_]+`, "g"), (reference) => {
    return reference;
  });
}

export function redactSecrets(input: string): string {
  const withReferencesProtected = preserveSecretReferences(input);
  let redacted = withReferencesProtected;

  for (const rule of REDACTION_RULES) {
    redacted = redacted.replace(rule.pattern, rule.replace);
  }

  return redacted;
}
