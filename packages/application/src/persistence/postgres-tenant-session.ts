import { TENANT_DATABASE_ROLE, TENANT_SESSION_KEYS, type TenantContext } from "@arise/domain";

export interface PostgresQueryable {
  query(queryText: string, values?: unknown[]): Promise<unknown>;
}

export async function applyPostgresTenantSession(
  client: PostgresQueryable,
  context: TenantContext,
): Promise<void> {
  await client.query(`SET LOCAL ROLE ${TENANT_DATABASE_ROLE}`);
  await client.query("select set_config($1, $2, true)", [
    TENANT_SESSION_KEYS.organizationId,
    context.organizationId,
  ]);
  await client.query("select set_config($1, $2, true)", [
    TENANT_SESSION_KEYS.userId,
    context.userId,
  ]);
}

export async function withPostgresTenantSession<T>(
  client: PostgresQueryable,
  context: TenantContext,
  operation: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await applyPostgresTenantSession(client, context);
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
