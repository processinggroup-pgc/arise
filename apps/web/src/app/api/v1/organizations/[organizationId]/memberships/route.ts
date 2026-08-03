import { createOrganizationMembershipsHandler } from "@arise/application";

import { getAuditStore } from "@/lib/audit-store";
import { getIdentityStore } from "@/lib/identity-store";

export const GET = createOrganizationMembershipsHandler({
  identityStore: getIdentityStore(),
  auditStore: getAuditStore(),
});
