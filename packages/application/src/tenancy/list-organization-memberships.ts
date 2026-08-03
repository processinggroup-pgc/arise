import { assertMatchingOrganization } from "@arise/domain";

import type { AuditStore } from "../audit/audit-store.js";
import { recordTenantScopeViolation } from "../audit/record-audit-event.js";
import type { IdentityStore } from "../identity/identity-store.js";
import { mapTenantScopeViolation, resolveApiTenantContext } from "./resolve-api-tenant-context.js";

export interface ListOrganizationMembershipsDependencies {
  identityStore: IdentityStore;
  auditStore?: AuditStore;
  createAuditEventId?: () => string;
  now?: () => Date;
}

export async function listOrganizationMembershipsForApi(
  requestedOrganizationId: string,
  headers: Headers,
  dependencies: ListOrganizationMembershipsDependencies,
): Promise<{
  tenantContext: Awaited<ReturnType<typeof resolveApiTenantContext>>;
  memberships: Awaited<ReturnType<IdentityStore["listMembershipsForOrganization"]>>;
}> {
  const { identityStore, auditStore, createAuditEventId, now } = dependencies;
  const tenantContext = await resolveApiTenantContext(headers, identityStore);

  try {
    assertMatchingOrganization(tenantContext, requestedOrganizationId);
  } catch (error) {
    const mapped = mapTenantScopeViolation(error);
    if (mapped !== undefined) {
      if (auditStore !== undefined) {
        await recordTenantScopeViolation(tenantContext, requestedOrganizationId, auditStore, {
          createId: createAuditEventId ?? (() => crypto.randomUUID()),
          now: now ?? (() => new Date()),
        });
      }

      throw mapped;
    }

    throw error;
  }

  const memberships = await identityStore.listMembershipsForOrganization(requestedOrganizationId);

  return {
    tenantContext,
    memberships,
  };
}
