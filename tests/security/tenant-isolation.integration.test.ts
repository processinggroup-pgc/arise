import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withPostgresTenantSession } from "@arise/application";
import { createTenantContext } from "@arise/domain";

import { getIntegrationDatabaseUrl } from "./integration-global-setup.js";

const ORG_A_ID = "11111111-1111-4111-8111-111111111111";
const ORG_B_ID = "22222222-2222-4222-8222-222222222222";
const USER_A_ID = "33333333-3333-4333-8333-333333333333";
const USER_B_ID = "44444444-4444-4444-8444-444444444444";

describe.runIf(Boolean(getIntegrationDatabaseUrl()))("tenant database isolation", () => {
  let adminClient: pg.Client;
  const databaseUrl = getIntegrationDatabaseUrl();

  beforeAll(async () => {
    adminClient = new pg.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await adminClient.connect();

    await adminClient.query(
      `
      delete from public.organization_memberships
      where organization_id in ($1::uuid, $2::uuid)
      `,
      [ORG_A_ID, ORG_B_ID],
    );

    await adminClient.query(
      `
      insert into public.organizations (id, name, slug, plan, data_region)
      values
        ($1, 'RLS Test Org A', 'rls-test-org-a', 'starter', 'us-east-1'),
        ($2, 'RLS Test Org B', 'rls-test-org-b', 'starter', 'us-east-1')
      on conflict (id) do update set name = excluded.name
      `,
      [ORG_A_ID, ORG_B_ID],
    );

    await adminClient.query(
      `
      insert into public.user_profiles (id, email, display_name)
      values
        ($1, 'rls-test-user-a@example.com', 'RLS User A'),
        ($2, 'rls-test-user-b@example.com', 'RLS User B')
      on conflict (id) do nothing
      `,
      [USER_A_ID, USER_B_ID],
    );

    await adminClient.query(
      `
      insert into public.organization_memberships (organization_id, user_id, role, status)
      values
        ($1, $3, 'owner', 'active'),
        ($2, $4, 'owner', 'active')
      on conflict (organization_id, user_id) do nothing
      `,
      [ORG_A_ID, ORG_B_ID, USER_A_ID, USER_B_ID],
    );
  });

  afterAll(async () => {
    await adminClient.end();
  });

  it("returns only the scoped organization for tenant A", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-org-a",
    });

    const organizations = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ id: string }>(
        "select id from public.organizations order by slug",
      );
      return result.rows;
    });

    expect(organizations).toEqual([{ id: ORG_A_ID }]);
  });

  it("returns only memberships for tenant A", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-memberships-a",
    });

    const memberships = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ organization_id: string; user_id: string }>(
        "select organization_id, user_id from public.organization_memberships",
      );
      return result.rows;
    });

    expect(memberships).toEqual([{ organization_id: ORG_A_ID, user_id: USER_A_ID }]);
  });

  it("blocks tenant A from reading tenant B organization rows", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-cross-tenant",
    });

    const organizations = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ id: string }>(
        "select id from public.organizations where id = $1",
        [ORG_B_ID],
      );
      return result.rows;
    });

    expect(organizations).toEqual([]);
  });

  it("blocks tenant B from reading tenant A organization rows", async () => {
    const context = createTenantContext({
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
      correlationId: "integration-cross-tenant-b",
    });

    const organizations = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ id: string }>(
        "select id from public.organizations where id = $1",
        [ORG_A_ID],
      );
      return result.rows;
    });

    expect(organizations).toEqual([]);
  });
});
