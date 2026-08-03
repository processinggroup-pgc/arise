import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
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

function fixPasswordEncoding(connectionString) {
  return connectionString.replace(/:\[%5B(.+?)%5D\]@/u, ":%5B$1%5D@");
}

async function testPostgresConnection(connectionString) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query("select version() as version");
    return { ok: true, serverVersion: result.rows[0]?.version ?? "unknown" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function testSupabaseRest(supabaseUrl, apiKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status >= 200 && response.status < 300) {
      return { ok: true, status: response.status };
    }

    if (response.status === 401) {
      return { ok: false, error: `HTTP ${response.status} (key rejected)` };
    }

    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPostgresCheck(label, connectionString, variants) {
  for (const [variantLabel, variantUrl] of variants) {
    const result = await testPostgresConnection(variantUrl);
    if (result.ok) {
      console.log(`PASS ${label} (${variantLabel})`);
      console.log(`  ${result.serverVersion.split(",")[0]}`);
      return;
    }

    console.log(`FAIL ${label} (${variantLabel})`);
    console.log(`  ${result.error}`);
  }

  process.exitCode = 1;
}

async function runRestCheck(label, supabaseUrl, apiKey) {
  const result = await testSupabaseRest(supabaseUrl, apiKey);
  if (!result.ok) {
    console.log(`FAIL ${label}`);
    console.log(`  ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${label}`);
  console.log(`  status=${result.status}`);
}

const envPath = resolve(scriptDirectory, "..", ".env");
const env = loadEnvFile(envPath);

const databaseUrl = env["DATABASE_URL"];
const directUrl = env["DIRECT_URL"];
const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const anonKey = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const serviceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];

const checks = [];

if (supabaseUrl && anonKey) {
  checks.push(runRestCheck("Supabase REST (anon key)", supabaseUrl, anonKey));
}

if (supabaseUrl && serviceRoleKey) {
  checks.push(runRestCheck("Supabase REST (service role key)", supabaseUrl, serviceRoleKey));
}

if (databaseUrl) {
  checks.push(
    runPostgresCheck("DATABASE_URL (pooler)", databaseUrl, [
      ["fixed-password-encoding", fixPasswordEncoding(databaseUrl)],
      ["as-configured", databaseUrl],
    ]),
  );
}

if (directUrl) {
  checks.push(
    runPostgresCheck("DIRECT_URL (direct postgres)", directUrl, [
      ["fixed-password-encoding", fixPasswordEncoding(directUrl)],
      ["as-configured", directUrl],
    ]),
  );
}

if (checks.length === 0) {
  console.log("FAIL no connection variables found in .env");
  process.exitCode = 1;
} else {
  await Promise.all(checks);
}
