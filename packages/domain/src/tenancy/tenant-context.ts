export interface TenantContext {
  organizationId: string;
  userId: string;
  correlationId: string;
}

export interface CreateTenantContextInput {
  organizationId: string;
  userId: string;
  correlationId?: string;
}

export class TenantScopeViolationError extends Error {
  constructor(message = "Tenant scope violation") {
    super(message);
    this.name = "TenantScopeViolationError";
  }
}

export function createTenantContext(input: CreateTenantContextInput): TenantContext {
  const organizationId = input.organizationId.trim();
  const userId = input.userId.trim();
  const correlationId = input.correlationId?.trim() ?? "";

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  if (userId.length === 0) {
    throw new Error("User identifier is required");
  }

  if (correlationId.length === 0) {
    throw new Error("Correlation identifier is required");
  }

  return {
    organizationId,
    userId,
    correlationId,
  };
}

export function assertMatchingOrganization(
  context: TenantContext,
  requestedOrganizationId: string,
): void {
  if (context.organizationId !== requestedOrganizationId) {
    throw new TenantScopeViolationError("Cross-tenant organization access is blocked");
  }
}
