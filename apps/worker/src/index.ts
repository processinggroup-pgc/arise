import { validateEnvironment } from "@arise/domain";

function toEnvironmentRecord(env: NodeJS.ProcessEnv): Readonly<Record<string, string | undefined>> {
  return env;
}

export function createWorkerHealthCheck(
  env: Readonly<Record<string, string | undefined>> = toEnvironmentRecord(process.env),
): { ready: boolean; errors: string[] } {
  const validation = validateEnvironment(env);

  return {
    ready: validation.valid,
    errors: validation.errors,
  };
}
