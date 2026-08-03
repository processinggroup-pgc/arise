import {
  FakeVercelProjectAdapter,
  HttpVercelProjectAdapter,
  type VercelProjectPort,
} from "@arise/application";

let vercelProjectPort: VercelProjectPort | undefined;

function readEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getVercelProjectPort(): VercelProjectPort {
  if (vercelProjectPort !== undefined) {
    return vercelProjectPort;
  }

  const useFake = readEnv(["ARISE_USE_FAKE_VERCEL"]) === "true";
  const token = readEnv(["VERCEL_TOKEN", "VERCEL_ACCESS_TOKEN"]);

  if (!useFake && token !== undefined) {
    vercelProjectPort = new HttpVercelProjectAdapter({
      token,
      ...(readEnv(["VERCEL_TEAM_ID"]) !== undefined ? { teamId: readEnv(["VERCEL_TEAM_ID"]) } : {}),
    });
    return vercelProjectPort;
  }

  vercelProjectPort = new FakeVercelProjectAdapter();
  return vercelProjectPort;
}

export function usesLiveVercelApi(): boolean {
  return readEnv(["ARISE_USE_FAKE_VERCEL"]) !== "true" && readEnv(["VERCEL_TOKEN", "VERCEL_ACCESS_TOKEN"]) !== undefined;
}
