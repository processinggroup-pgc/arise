import type { Organization } from "@arise/domain";

import type { IdentityStore } from "./identity-store.js";

export async function listOrganizationsForUser(
  userId: string,
  store: IdentityStore,
): Promise<Organization[]> {
  const memberships = await store.listMembershipsForUser(userId);
  const organizations: Organization[] = [];

  for (const membership of memberships) {
    if (membership.status !== "active") {
      continue;
    }

    const organization = await store.findOrganizationById(membership.organizationId);
    if (organization !== undefined) {
      organizations.push(organization);
    }
  }

  return organizations.sort((left, right) => left.name.localeCompare(right.name));
}
