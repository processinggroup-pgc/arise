import { describe, expect, it } from "vitest";

import { AUDIT_EVENT_TYPES } from "@arise/domain";

import { InMemoryAuditStore } from "../audit/in-memory-audit-store.js";
import { InMemoryIdentityStore } from "../identity/in-memory-identity-store.js";
import { registerOrganization } from "../identity/register-organization.js";
import { listOrganizationMembershipsForApi } from "./list-organization-memberships.js";
import {
  resolveApiTenantContext,
  TENANT_HEADERS,
  TenantContextError,
} from "./resolve-api-tenant-context.js";

describe("resolveApiTenantContext", () => {
  it("requires tenant headers on every API request", async () => {
    const store = new InMemoryIdentityStore();

    await expect(resolveApiTenantContext(new Headers(), store)).rejects.toMatchObject({
      code: "missing_tenant_header",
      statusCode: 400,
    });
  });

  it("requires an active membership for the requested organization", async () => {
    const store = new InMemoryIdentityStore();

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_owner",
      },
      store,
      {
        createId: () => "org_123",
        now: () => new Date("2026-08-03T00:00:00.000Z"),
      },
    );

    await expect(
      resolveApiTenantContext(
        new Headers({
          [TENANT_HEADERS.organizationId]: "org_123",
          [TENANT_HEADERS.userId]: "user_stranger",
        }),
        store,
      ),
    ).rejects.toMatchObject({
      code: "membership_not_found",
      statusCode: 403,
    });
  });
});

describe("listOrganizationMembershipsForApi", () => {
  it("returns memberships when tenant context matches the requested organization", async () => {
    const store = new InMemoryIdentityStore();

    await registerOrganization(
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_owner",
      },
      store,
      {
        createId: () => "org_123",
        now: () => new Date("2026-08-03T00:00:00.000Z"),
      },
    );

    const result = await listOrganizationMembershipsForApi(
      "org_123",
      new Headers({
        [TENANT_HEADERS.organizationId]: "org_123",
        [TENANT_HEADERS.userId]: "user_owner",
      }),
      { identityStore: store },
    );

    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0]?.userId).toBe("user_owner");
  });

  it("records denied cross-tenant access in the audit trail", async () => {
    const store = new InMemoryIdentityStore();
    const auditStore = new InMemoryAuditStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Tenant A",
        slug: "tenant-a-audit",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_a",
      },
      store,
      {
        createId: () => "org_a",
        now: () => createdAt,
      },
    );

    await registerOrganization(
      {
        name: "Tenant B",
        slug: "tenant-b-audit",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_b",
      },
      store,
      {
        createId: () => "org_b",
        now: () => createdAt,
      },
    );

    await expect(
      listOrganizationMembershipsForApi(
        "org_b",
        new Headers({
          [TENANT_HEADERS.organizationId]: "org_a",
          [TENANT_HEADERS.userId]: "user_a",
          [TENANT_HEADERS.correlationId]: "corr_denied",
        }),
        {
          identityStore: store,
          auditStore,
          createAuditEventId: () => "audit_denied",
          now: () => createdAt,
        },
      ),
    ).rejects.toMatchObject({
      code: "tenant_scope_violation",
      statusCode: 403,
    });

    const events = await auditStore.listEventsForOrganization("org_a");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "audit_denied",
      eventType: AUDIT_EVENT_TYPES.tenantScopeViolation,
      subject: "org_b",
      correlationId: "corr_denied",
      organizationId: "org_a",
      actorId: "user_a",
    });
  });

  it("blocks cross-tenant organization access at the API layer", async () => {
    const store = new InMemoryIdentityStore();
    const createdAt = new Date("2026-08-03T00:00:00.000Z");

    await registerOrganization(
      {
        name: "Tenant A",
        slug: "tenant-a",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_a",
      },
      store,
      {
        createId: () => "org_a",
        now: () => createdAt,
      },
    );

    await registerOrganization(
      {
        name: "Tenant B",
        slug: "tenant-b",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_b",
      },
      store,
      {
        createId: () => "org_b",
        now: () => createdAt,
      },
    );

    await expect(
      listOrganizationMembershipsForApi(
        "org_b",
        new Headers({
          [TENANT_HEADERS.organizationId]: "org_a",
          [TENANT_HEADERS.userId]: "user_a",
        }),
        { identityStore: store },
      ),
    ).rejects.toBeInstanceOf(TenantContextError);

    await expect(
      listOrganizationMembershipsForApi(
        "org_b",
        new Headers({
          [TENANT_HEADERS.organizationId]: "org_a",
          [TENANT_HEADERS.userId]: "user_a",
        }),
        { identityStore: store },
      ),
    ).rejects.toMatchObject({
      code: "tenant_scope_violation",
      statusCode: 403,
    });
  });
});
