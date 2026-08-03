import {
  InMemoryIdentityStore,
  PostgresIdentityStore,
  type IdentityStore,
} from "@arise/application";
import pg from "pg";

let identityStore: IdentityStore | undefined;
let pool: pg.Pool | undefined;

function getDatabasePool(): pg.Pool {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required for Postgres identity storage");
  }

  pool ??= new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  return pool;
}

export function getIdentityStore(): IdentityStore {
  identityStore ??=
    process.env["DATABASE_URL"] !== undefined && process.env["DATABASE_URL"].length > 0
      ? new PostgresIdentityStore(getDatabasePool())
      : new InMemoryIdentityStore();

  return identityStore;
}

export function usesPersistentIdentityStore(): boolean {
  return process.env["DATABASE_URL"] !== undefined && process.env["DATABASE_URL"].length > 0;
}
