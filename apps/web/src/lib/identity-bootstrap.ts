import {
  PostgresIdentityStore,
  withPostgresIdentityBootstrapSession,
  type IdentityStore,
} from "@arise/application";

import { getDatabasePool, hasDatabaseUrl } from "./database";
import { getIdentityStore } from "./identity-store";

export async function runWithIdentityStore<T>(
  userId: string,
  operation: (store: IdentityStore) => Promise<T>,
): Promise<T> {
  if (!hasDatabaseUrl()) {
    return operation(getIdentityStore());
  }

  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    return await withPostgresIdentityBootstrapSession(client, userId, async () =>
      operation(new PostgresIdentityStore(client)),
    );
  } finally {
    client.release();
  }
}
