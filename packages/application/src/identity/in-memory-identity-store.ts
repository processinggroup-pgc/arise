import type { Organization, OrganizationMembership } from "@arise/domain";

import type { IdentityStore } from "./identity-store.js";

export class InMemoryIdentityStore implements IdentityStore {
  private readonly organizations = new Map<string, Organization>();
  private readonly organizationsBySlug = new Map<string, Organization>();
  private readonly memberships = new Map<string, OrganizationMembership>();

  findOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Promise.resolve(this.organizationsBySlug.get(slug));
  }

  findOrganizationById(organizationId: string): Promise<Organization | undefined> {
    return Promise.resolve(this.organizations.get(organizationId));
  }

  saveOrganization(organization: Organization): Promise<void> {
    this.organizations.set(organization.id, organization);
    this.organizationsBySlug.set(organization.slug, organization);
    return Promise.resolve();
  }

  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | undefined> {
    return Promise.resolve(
      [...this.memberships.values()].find(
        (membership) =>
          membership.organizationId === organizationId && membership.userId === userId,
      ),
    );
  }

  saveMembership(membership: OrganizationMembership): Promise<void> {
    this.memberships.set(membership.id, membership);
    return Promise.resolve();
  }

  listMembershipsForOrganization(organizationId: string): Promise<OrganizationMembership[]> {
    return Promise.resolve(
      [...this.memberships.values()].filter(
        (membership) => membership.organizationId === organizationId,
      ),
    );
  }

  listMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
    return Promise.resolve(
      [...this.memberships.values()].filter((membership) => membership.userId === userId),
    );
  }
}
