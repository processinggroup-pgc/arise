export class VercelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

export interface VercelApiClientConfig {
  token: string;
  teamId?: string;
}

export async function vercelApiRequest<T>(
  path: string,
  config: VercelApiClientConfig,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`https://api.vercel.com${path}`);
  if (config.teamId !== undefined && config.teamId.length > 0) {
    url.searchParams.set("teamId", config.teamId);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new VercelApiError(
      `Vercel API request failed: ${options.method ?? "GET"} ${path}`,
      response.status,
      responseBody,
    );
  }

  if (responseBody.length === 0) {
    return {} as T;
  }

  return JSON.parse(responseBody) as T;
}
