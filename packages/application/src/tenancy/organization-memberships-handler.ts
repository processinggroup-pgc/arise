import type { AuditStore } from "../audit/audit-store.js";
import type { IdentityStore } from "../identity/identity-store.js";
import { listOrganizationMembershipsForApi } from "./list-organization-memberships.js";
import { TenantContextError } from "./tenant-context-error.js";

export interface OrganizationMembershipsHandlerDependencies {
  identityStore: IdentityStore;
  auditStore?: AuditStore;
}

export function createOrganizationMembershipsHandler(
  dependencies: OrganizationMembershipsHandlerDependencies | IdentityStore,
): (
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) => Promise<Response> {
  const resolvedDependencies =
    "findOrganizationById" in dependencies
      ? { identityStore: dependencies, auditStore: undefined }
      : dependencies;

  return async function handleOrganizationMembershipsRequest(
    request: Request,
    context: { params: Promise<{ organizationId: string }> },
  ): Promise<Response> {
    const { organizationId } = await context.params;

    try {
      const listDependencies: {
        identityStore: IdentityStore;
        auditStore?: AuditStore;
      } = {
        identityStore: resolvedDependencies.identityStore,
      };

      if (resolvedDependencies.auditStore !== undefined) {
        listDependencies.auditStore = resolvedDependencies.auditStore;
      }

      const result = await listOrganizationMembershipsForApi(
        organizationId,
        request.headers,
        listDependencies,
      );

      return Response.json({
        organizationId: result.tenantContext.organizationId,
        memberships: result.memberships,
      });
    } catch (error) {
      if (error instanceof TenantContextError) {
        return Response.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: error.statusCode },
        );
      }

      throw error;
    }
  };
}
