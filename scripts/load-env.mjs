import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function loadEnvFile(filePath) {
  const env = {};

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    env[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
  }

  return env;
}

export function loadRepositoryEnv() {
  const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  return loadEnvFile(join(repositoryRoot, ".env"));
}
