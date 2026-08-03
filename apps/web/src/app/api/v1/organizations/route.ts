import { createRegisterOrganizationHandler } from "@arise/application";

import { getIdentityStore } from "@/lib/identity-store";

export const POST = createRegisterOrganizationHandler({
  identityStore: getIdentityStore(),
});
