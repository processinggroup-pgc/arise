import { InMemoryIdentityStore, type IdentityStore } from "@arise/application";

const identityStore: IdentityStore = new InMemoryIdentityStore();

export function getIdentityStore(): IdentityStore {
  return identityStore;
}
