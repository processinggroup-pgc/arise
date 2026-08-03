export const MEMBERSHIP_ROLES = ["owner", "admin", "member"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["active", "invited", "suspended"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: Date;
}

export interface CreateOrganizationMembershipInput {
  organizationId: string;
  userId: string;
  role: string;
  status: string;
}

export interface CreateOrganizationMembershipMetadata {
  id: string;
  createdAt: Date;
}

function assertMembershipRole(role: string): MembershipRole {
  if (!(MEMBERSHIP_ROLES as readonly string[]).includes(role)) {
    throw new Error("Membership role is invalid");
  }

  return role as MembershipRole;
}

function assertMembershipStatus(status: string): MembershipStatus {
  if (!(MEMBERSHIP_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Membership status is invalid");
  }

  return status as MembershipStatus;
}

export function createOrganizationMembership(
  input: CreateOrganizationMembershipInput,
  metadata: CreateOrganizationMembershipMetadata,
): OrganizationMembership {
  return {
    id: metadata.id,
    organizationId: input.organizationId,
    userId: input.userId,
    role: assertMembershipRole(input.role),
    status: assertMembershipStatus(input.status),
    createdAt: metadata.createdAt,
  };
}
