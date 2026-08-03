import { createTenantContext, TenantScopeViolationError, type TenantContext } from "@arise/domain";

import type { IdentityStore } from "../identity/identity-store.js";
import { TENANT_HEADERS, TenantContextError } from "./tenant-context-error.js";

function readHeader(
  headers: Headers | Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  return headers[name];
}

export async function resolveApiTenantContext(
  headers: Headers | Readonly<Record<string, string | undefined>>,
  store: IdentityStore,
): Promise<TenantContext> {
  const organizationId = readHeader(headers, TENANT_HEADERS.organizationId);
  const userId = readHeader(headers, TENANT_HEADERS.userId);
  const correlationId = readHeader(headers, TENANT_HEADERS.correlationId) ?? crypto.randomUUID();

  if (organizationId === undefined || userId === undefined) {
    throw new TenantContextError(
      "Tenant context headers are required",
      400,
      "missing_tenant_header",
    );
  }

  let tenantContext: TenantContext;
  try {
    tenantContext = createTenantContext({
      organizationId,
      userId,
      correlationId,
    });
  } catch (error) {
    throw new TenantContextError(
      error instanceof Error ? error.message : "Tenant context is invalid",
      400,
      "invalid_tenant_context",
    );
  }

  const organization = await store.findOrganizationById(tenantContext.organizationId);
  if (organization === undefined) {
    throw new TenantContextError("Organization was not found", 404, "organization_not_found");
  }

  const membership = await store.findMembership(tenantContext.organizationId, tenantContext.userId);
  if (membership === undefined) {
    throw new TenantContextError(
      "Membership was not found for this organization",
      403,
      "membership_not_found",
    );
  }

  if (membership.status !== "active") {
    throw new TenantContextError("Membership is not active", 403, "membership_inactive");
  }

  return tenantContext;
}

export { TENANT_HEADERS, TenantContextError } from "./tenant-context-error.js";

export function mapTenantScopeViolation(error: unknown): TenantContextError | undefined {
  if (!(error instanceof TenantScopeViolationError)) {
    return undefined;
  }

  return new TenantContextError(error.message, 403, "tenant_scope_violation");
}
