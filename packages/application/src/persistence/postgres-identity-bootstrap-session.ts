import { TENANT_DATABASE_ROLE, TENANT_SESSION_KEYS } from "@arise/domain";

import type { PostgresQueryable } from "./postgres-tenant-session.js";

export async function applyPostgresIdentityBootstrapSession(
  client: PostgresQueryable,
  userId: string,
): Promise<void> {
  await client.query(`SET LOCAL ROLE ${TENANT_DATABASE_ROLE}`);
  await client.query("select set_config($1, $2, true)", [TENANT_SESSION_KEYS.organizationId, ""]);
  await client.query("select set_config($1, $2, true)", [TENANT_SESSION_KEYS.userId, userId]);
}

export async function withPostgresIdentityBootstrapSession<T>(
  client: PostgresQueryable,
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await applyPostgresIdentityBootstrapSession(client, userId);
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
