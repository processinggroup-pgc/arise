import { createOrganizationMembership, type OrganizationMembership } from "@arise/domain";

import type { IdentityOperationContext, IdentityStore } from "./identity-store.js";

export interface AddOrganizationMemberCommand {
  organizationId: string;
  userId: string;
  role: string;
  status: string;
}

export async function addOrganizationMember(
  command: AddOrganizationMemberCommand,
  store: IdentityStore,
  context: IdentityOperationContext,
): Promise<OrganizationMembership> {
  const organization = await store.findOrganizationById(command.organizationId);
  if (organization === undefined) {
    throw new Error("Organization was not found");
  }

  const existingMembership = await store.findMembership(command.organizationId, command.userId);
  if (existingMembership !== undefined) {
    throw new Error("Membership already exists for this user");
  }

  const membership = createOrganizationMembership(
    {
      organizationId: command.organizationId,
      userId: command.userId,
      role: command.role,
      status: command.status,
    },
    {
      id: context.createId(),
      createdAt: context.now(),
    },
  );

  await store.saveMembership(membership);

  return membership;
}
