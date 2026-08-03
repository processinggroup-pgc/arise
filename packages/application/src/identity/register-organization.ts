import {
  createOrganization,
  createOrganizationMembership,
  type Organization,
  type OrganizationMembership,
} from "@arise/domain";

import type { IdentityOperationContext, IdentityStore } from "./identity-store.js";

export interface RegisterOrganizationCommand {
  name: string;
  slug: string;
  plan: string;
  dataRegion: string;
  ownerUserId: string;
}

export interface RegisterOrganizationResult {
  organization: Organization;
  membership: OrganizationMembership;
}

export async function registerOrganization(
  command: RegisterOrganizationCommand,
  store: IdentityStore,
  context: IdentityOperationContext,
): Promise<RegisterOrganizationResult> {
  const organization = createOrganization(
    {
      name: command.name,
      slug: command.slug,
      plan: command.plan,
      dataRegion: command.dataRegion,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  const existingOrganization = await store.findOrganizationBySlug(organization.slug);
  if (existingOrganization !== undefined) {
    throw new Error("Organization slug is already in use");
  }

  const membership = createOrganizationMembership(
    {
      organizationId: organization.id,
      userId: command.ownerUserId,
      role: "owner",
      status: "active",
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await store.saveOrganization(organization);
  await store.saveMembership(membership);

  return {
    organization,
    membership,
  };
}
