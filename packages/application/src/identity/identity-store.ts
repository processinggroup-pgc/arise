import type { Organization, OrganizationMembership } from "@arise/domain";

export interface IdentityStore {
  findOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  findOrganizationById(organizationId: string): Promise<Organization | undefined>;
  saveOrganization(organization: Organization): Promise<void>;
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | undefined>;
  saveMembership(membership: OrganizationMembership): Promise<void>;
  listMembershipsForOrganization(organizationId: string): Promise<OrganizationMembership[]>;
  listMembershipsForUser(userId: string): Promise<OrganizationMembership[]>;
}

export interface IdentityOperationContext {
  createId(): string;
  now(): Date;
}
