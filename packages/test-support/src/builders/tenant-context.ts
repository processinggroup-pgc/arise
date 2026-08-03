import { createTenantContext, type TenantContext } from "@arise/domain";

import { TENANT_HEADERS } from "@arise/application";

export type { TenantContext };

export function buildTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return createTenantContext({
    organizationId: "org_test",
    userId: "user_test",
    correlationId: "corr_test",
    ...overrides,
  });
}

export function buildTenantHeaders(context: TenantContext): Record<string, string> {
  return {
    [TENANT_HEADERS.organizationId]: context.organizationId,
    [TENANT_HEADERS.userId]: context.userId,
    [TENANT_HEADERS.correlationId]: context.correlationId,
  };
}
