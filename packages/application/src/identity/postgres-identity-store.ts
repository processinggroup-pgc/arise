import type {
  MembershipRole,
  MembershipStatus,
  Organization,
  OrganizationMembership,
  OrganizationPlan,
} from "@arise/domain";

import {
  bootstrapDefaultProject,
  type BootstrapDefaultProjectInput,
} from "../project/bootstrap-default-project.js";
import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import { OWNER_EMAIL_IN_USE_MESSAGE } from "./identity-errors.js";
import type { IdentityStore } from "./identity-store.js";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  data_region: string;
  created_at: Date;
}

interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: Date;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    dataRegion: row.data_region,
    createdAt: row.created_at,
  };
}

function mapMembership(row: MembershipRow): OrganizationMembership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function isUserProfileEmailConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const pgError = error as { code?: string; constraint?: string; message?: string };
  return (
    pgError.code === "23505" &&
    (pgError.constraint === "user_profiles_email_key" ||
      pgError.message === OWNER_EMAIL_IN_USE_MESSAGE)
  );
}

export class PostgresIdentityStore implements IdentityStore {
  constructor(private readonly client: PostgresQueryable) {}

  async findOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const result = (await this.client.query(
      `
      select id, name, slug, plan, data_region, created_at
      from public.arise_find_organization_by_slug($1)
      `,
      [slug],
    )) as { rows: OrganizationRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapOrganization(row);
  }

  async findOrganizationById(organizationId: string): Promise<Organization | undefined> {
    const result = (await this.client.query(
      `
      select id, name, slug, plan, data_region, created_at
      from public.organizations
      where id = $1
      `,
      [organizationId],
    )) as { rows: OrganizationRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapOrganization(row);
  }

  async saveOrganization(organization: Organization): Promise<void> {
    await this.client.query(
      `
      insert into public.organizations (id, name, slug, plan, data_region, created_at)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (id) do update
      set
        name = excluded.name,
        slug = excluded.slug,
        plan = excluded.plan,
        data_region = excluded.data_region
      `,
      [
        organization.id,
        organization.name,
        organization.slug,
        organization.plan,
        organization.dataRegion,
        organization.createdAt,
      ],
    );
  }

  async findMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | undefined> {
    const result = (await this.client.query(
      `
      select id, organization_id, user_id, role, status, created_at
      from public.organization_memberships
      where organization_id = $1 and user_id = $2
      `,
      [organizationId, userId],
    )) as { rows: MembershipRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapMembership(row);
  }

  async prepareOrganizationOwner(userId: string, ownerEmail?: string): Promise<void> {
    const email = ownerEmail ?? `${userId}@users.arise.studio`;

    try {
      await this.client.query(`select public.arise_prepare_user_profile($1, $2, $3)`, [
        userId,
        email,
        "Workspace owner",
      ]);
    } catch (error) {
      if (isUserProfileEmailConflict(error)) {
        throw new Error(OWNER_EMAIL_IN_USE_MESSAGE);
      }

      throw error;
    }
  }

  async saveMembership(membership: OrganizationMembership): Promise<void> {
    await this.client.query(
      `
      insert into public.organization_memberships (
        id,
        organization_id,
        user_id,
        role,
        status,
        created_at
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (organization_id, user_id) do update
      set
        role = excluded.role,
        status = excluded.status
      `,
      [
        membership.id,
        membership.organizationId,
        membership.userId,
        membership.role,
        membership.status,
        membership.createdAt,
      ],
    );
  }

  async listMembershipsForOrganization(organizationId: string): Promise<OrganizationMembership[]> {
    const result = (await this.client.query(
      `
      select id, organization_id, user_id, role, status, created_at
      from public.organization_memberships
      where organization_id = $1
      order by created_at asc
      `,
      [organizationId],
    )) as { rows: MembershipRow[] };

    return result.rows.map(mapMembership);
  }

  async listMembershipsForUser(userId: string): Promise<OrganizationMembership[]> {
    const result = (await this.client.query(
      `
      select id, organization_id, user_id, role, status, created_at
      from public.organization_memberships
      where user_id = $1
      order by created_at asc
      `,
      [userId],
    )) as { rows: MembershipRow[] };

    return result.rows.map(mapMembership);
  }

  async bootstrapDefaultProject(input: BootstrapDefaultProjectInput) {
    return bootstrapDefaultProject(this.client, input);
  }
}
