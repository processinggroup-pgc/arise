import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadRepositoryEnv } from "./load-env.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, "..", "supabase", "migrations");
const env = loadRepositoryEnv();
const databaseUrl = env["DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (databaseUrl === undefined) {
  console.error("FAIL DATABASE_URL is required to apply migrations");
  process.exit(1);
}

const migrationFiles = readdirSync(migrationsDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  for (const migrationFile of migrationFiles) {
    const sql = readFileSync(join(migrationsDirectory, migrationFile), "utf8");
    await client.query(sql);
    console.log(`APPLIED ${migrationFile}`);
  }
} finally {
  await client.end();
}

console.log("DONE migrations applied");
