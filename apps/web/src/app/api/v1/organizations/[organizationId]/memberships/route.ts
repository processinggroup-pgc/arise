import { createOrganizationMembershipsHandler } from "@arise/application";

import { getAuditStore } from "../../../../../../lib/audit-store.js";
import { getIdentityStore } from "../../../../../../lib/identity-store.js";

export const GET = createOrganizationMembershipsHandler({
  identityStore: getIdentityStore(),
  auditStore: getAuditStore(),
});
