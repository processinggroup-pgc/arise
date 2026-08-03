import pg from "pg";

let pool: pg.Pool | undefined;

export function hasDatabaseUrl(): boolean {
  const databaseUrl = process.env["DATABASE_URL"];
  return databaseUrl !== undefined && databaseUrl.length > 0;
}

export function getDatabasePool(): pg.Pool {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required for Postgres storage");
  }

  pool ??= new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  return pool;
}
