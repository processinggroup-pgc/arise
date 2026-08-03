export function resolveEnvRef(ref: string, env: NodeJS.ProcessEnv = process.env): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith("env:")) {
    return env[trimmed.slice(4)] ?? "";
  }

  return trimmed;
}

export function readProcessEnv(keys: string[], env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
