import { createRegisterOrganizationHandler, TENANT_HEADERS } from "@arise/application";

import { runWithIdentityStore } from "@/lib/identity-bootstrap";

export async function POST(request: Request): Promise<Response> {
  const userId = request.headers.get(TENANT_HEADERS.userId)?.trim();

  if (userId === undefined || userId.length === 0) {
    return Response.json(
      {
        error: {
          code: "missing_owner_user",
          message: "Owner user id header is required",
        },
      },
      { status: 400 },
    );
  }

  return runWithIdentityStore(userId, (identityStore) =>
    createRegisterOrganizationHandler({ identityStore })(request),
  );
}
