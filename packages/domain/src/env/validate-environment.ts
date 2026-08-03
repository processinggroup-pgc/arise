const ALLOWED_NODE_ENVS = new Set(["development", "test", "production"]);

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];

const SECRET_REFERENCE_PREFIX = "SECRET_REF:";

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
}

function containsRawSecret(value: string): boolean {
  if (value.startsWith(SECRET_REFERENCE_PREFIX)) {
    return false;
  }

  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

export function validateEnvironment(
  env: Readonly<Record<string, string | undefined>>,
): EnvironmentValidationResult {
  const errors: string[] = [];

  const nodeEnv = env["NODE_ENV"];
  if (nodeEnv !== undefined && !ALLOWED_NODE_ENVS.has(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${[...ALLOWED_NODE_ENVS].join(", ")}`);
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value.trim().length === 0) {
      continue;
    }

    if (containsRawSecret(value)) {
      errors.push(`${key} contains a raw secret value and must use ${SECRET_REFERENCE_PREFIX}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
