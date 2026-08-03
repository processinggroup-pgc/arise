const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function normalizeSessionId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || !isValidUuid(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export async function runSafely<T>(
  operation: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[arise-web] ${label}`, error);
    return fallback;
  }
}
