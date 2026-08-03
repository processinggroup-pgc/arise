import {
  InMemoryIdentityStore,
  PostgresIdentityStore,
  type IdentityStore,
} from "@arise/application";

import { getDatabasePool, hasDatabaseUrl } from "./database";

let identityStore: IdentityStore | undefined;

export function getIdentityStore(): IdentityStore {
  identityStore ??= hasDatabaseUrl()
    ? new PostgresIdentityStore(getDatabasePool())
    : new InMemoryIdentityStore();

  return identityStore;
}

export function usesPersistentIdentityStore(): boolean {
  return hasDatabaseUrl();
}
