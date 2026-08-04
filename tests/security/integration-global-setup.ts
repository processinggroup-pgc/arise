import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};

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

export function getIntegrationDatabaseUrl(): string | undefined {
  const env = {
    ...loadEnvFile(join(repositoryRoot, ".env")),
    ...process.env,
  };

  return env["INTEGRATION_DATABASE_URL"] ?? env["DATABASE_URL"];
}

export async function applyIntegrationMigrations(client: pg.Client): Promise<void> {
  const migrationsDirectory = join(repositoryRoot, "supabase", "migrations");
  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = readFileSync(join(migrationsDirectory, migrationFile), "utf8");
    await client.query(sql);
  }
}

export default async function integrationGlobalSetup(): Promise<void> {
  const databaseUrl = getIntegrationDatabaseUrl();
  if (databaseUrl === undefined) {
    return;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await applyIntegrationMigrations(client);
  } finally {
    await client.end();
  }
}
