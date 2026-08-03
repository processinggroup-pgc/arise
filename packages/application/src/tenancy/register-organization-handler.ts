import type { IdentityStore } from "../identity/identity-store.js";
import {
  OrganizationRegistrationError,
  registerOrganizationForApi,
  type RegisterOrganizationApiInput,
} from "./register-organization-for-api.js";

export interface RegisterOrganizationHandlerDependencies {
  identityStore: IdentityStore;
  createId?: () => string;
  now?: () => Date;
}

function isRegisterOrganizationInput(value: unknown): value is RegisterOrganizationApiInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<RegisterOrganizationApiInput>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.plan === "string" &&
    typeof candidate.dataRegion === "string"
  );
}

export function createRegisterOrganizationHandler(
  dependencies: RegisterOrganizationHandlerDependencies | IdentityStore,
): (request: Request) => Promise<Response> {
  const resolvedDependencies =
    "findOrganizationById" in dependencies
      ? { identityStore: dependencies }
      : dependencies;

  return async function handleRegisterOrganizationRequest(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          error: {
            code: "invalid_json",
            message: "Request body must be valid JSON",
          },
        },
        { status: 400 },
      );
    }

    if (!isRegisterOrganizationInput(body)) {
      return Response.json(
        {
          error: {
            code: "invalid_registration",
            message: "Organization registration fields are required",
          },
        },
        { status: 400 },
      );
    }

    try {
      const result = await registerOrganizationForApi(request.headers, body, {
        identityStore: resolvedDependencies.identityStore,
        createId: resolvedDependencies.createId ?? (() => crypto.randomUUID()),
        now: resolvedDependencies.now ?? (() => new Date()),
      });

      return Response.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof OrganizationRegistrationError) {
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
