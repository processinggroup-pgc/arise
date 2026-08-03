export const TENANT_HEADERS = {
  organizationId: "x-organization-id",
  userId: "x-user-id",
  correlationId: "x-correlation-id",
} as const;

export class TenantContextError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "TenantContextError";
  }
}
