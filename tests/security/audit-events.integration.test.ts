import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withPostgresTenantSession } from "@arise/application";
import { AUDIT_EVENT_TYPES, createTenantContext } from "@arise/domain";

import { getIntegrationDatabaseUrl } from "./integration-global-setup.js";

const ORG_A_ID = "11111111-1111-4111-8111-111111111111";
const ORG_B_ID = "22222222-2222-4222-8222-222222222222";
const USER_A_ID = "33333333-3333-4333-8333-333333333333";
const USER_B_ID = "44444444-4444-4444-8444-444444444444";
const AUDIT_A_ID = "55555555-5555-4555-8555-555555555555";
const AUDIT_B_ID = "66666666-6666-4666-8666-666666666666";

describe.runIf(Boolean(getIntegrationDatabaseUrl()))("audit events database controls", () => {
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
      insert into public.audit_events (
        id,
        organization_id,
        actor_type,
        actor_id,
        event_type,
        subject,
        correlation_id,
        payload_redacted
      )
      values
        ($1, $3, 'user', $5, $7, 'subject-a', 'corr-a', '{"scope":"a"}'),
        ($2, $4, 'user', $6, $7, 'subject-b', 'corr-b', '{"scope":"b"}')
      on conflict (id) do nothing
      `,
      [
        AUDIT_A_ID,
        AUDIT_B_ID,
        ORG_A_ID,
        ORG_B_ID,
        USER_A_ID,
        USER_B_ID,
        AUDIT_EVENT_TYPES.tenantScopeViolation,
      ],
    );
  });

  afterAll(async () => {
    await adminClient.end();
  });

  it("returns only tenant-scoped audit events", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-audit-read",
    });

    const events = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ id: string; organization_id: string }>(
        "select id, organization_id from public.audit_events where subject = $1",
        ["subject-a"],
      );
      return result.rows;
    });

    expect(events).toEqual([{ id: AUDIT_A_ID, organization_id: ORG_A_ID }]);
  });

  it("blocks cross-tenant audit event reads", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-audit-cross",
    });

    const events = await withPostgresTenantSession(adminClient, context, async () => {
      const result = await adminClient.query<{ id: string }>(
        "select id from public.audit_events where id = $1",
        [AUDIT_B_ID],
      );
      return result.rows;
    });

    expect(events).toEqual([]);
  });

  it("allows append-only inserts under tenant context", async () => {
    const context = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-audit-insert",
    });
    const insertedId = crypto.randomUUID();

    await withPostgresTenantSession(adminClient, context, async () => {
      await adminClient.query(
        `
        insert into public.audit_events (
          id,
          organization_id,
          actor_type,
          actor_id,
          event_type,
          subject,
          correlation_id,
          payload_redacted
        )
        values ($1, $2, 'user', $3, $4, 'inserted-subject', $5, '{}')
        `,
        [
          insertedId,
          ORG_A_ID,
          USER_A_ID,
          AUDIT_EVENT_TYPES.tenantScopeViolation,
          "integration-audit-insert",
        ],
      );
    });

    const readContext = createTenantContext({
      organizationId: ORG_A_ID,
      userId: USER_A_ID,
      correlationId: "integration-audit-read-insert",
    });

    const events = await withPostgresTenantSession(adminClient, readContext, async () => {
      const result = await adminClient.query<{ id: string }>(
        "select id from public.audit_events where id = $1",
        [insertedId],
      );
      return result.rows;
    });

    expect(events).toEqual([{ id: insertedId }]);
  });

  it("rejects audit event updates", async () => {
    await expect(
      adminClient.query("update public.audit_events set subject = 'tampered' where id = $1", [
        AUDIT_A_ID,
      ]),
    ).rejects.toThrow(/append-only/u);
  });

  it("rejects audit event deletes", async () => {
    await expect(
      adminClient.query("delete from public.audit_events where id = $1", [AUDIT_A_ID]),
    ).rejects.toThrow(/append-only/u);
  });
});
