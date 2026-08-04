import type { Organization, OrganizationMembership } from "@arise/domain";

import type { IdentityOperationContext, IdentityStore } from "../identity/identity-store.js";
import { OWNER_EMAIL_IN_USE_MESSAGE } from "../identity/identity-errors.js";
import type { RegisterOrganizationCommand } from "../identity/register-organization.js";
import { registerOrganization } from "../identity/register-organization.js";
import { TENANT_HEADERS } from "./tenant-context-error.js";

export interface RegisterOrganizationApiInput {
  name: string;
  slug: string;
  plan: string;
  dataRegion: string;
  ownerEmail?: string;
}

export interface RegisterOrganizationForApiDependencies
  extends IdentityOperationContext {
  identityStore: IdentityStore;
}

export interface RegisterOrganizationForApiResult {
  organization: Organization;
  membership: OrganizationMembership;
}

export class OrganizationRegistrationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "OrganizationRegistrationError";
  }
}

function readOwnerUserId(headers: Headers): string {
  const userId = headers.get(TENANT_HEADERS.userId)?.trim();
  if (userId === undefined || userId.length === 0) {
    throw new OrganizationRegistrationError(
      "Owner user id header is required",
      400,
      "missing_owner_user",
    );
  }

  return userId;
}

function mapRegistrationError(error: unknown): OrganizationRegistrationError {
  if (error instanceof OrganizationRegistrationError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message === "Organization slug is already in use") {
      return new OrganizationRegistrationError(error.message, 409, "organization_slug_in_use");
    }

    if (error.message === OWNER_EMAIL_IN_USE_MESSAGE) {
      return new OrganizationRegistrationError(error.message, 409, "owner_email_in_use");
    }

    return new OrganizationRegistrationError(error.message, 400, "invalid_registration");
  }

  return new OrganizationRegistrationError("Organization registration failed", 400, "invalid_registration");
}

function isOrganizationOwnerPreparer(
  store: IdentityStore,
): store is IdentityStore & {
  prepareOrganizationOwner(userId: string, ownerEmail?: string): Promise<void>;
} {
  return (
    "prepareOrganizationOwner" in store &&
    typeof store.prepareOrganizationOwner === "function"
  );
}

function supportsAtomicRegistration(
  store: IdentityStore,
): store is IdentityStore & {
  registerOrganizationAtomic(
    command: RegisterOrganizationCommand,
    context: IdentityOperationContext,
  ): Promise<RegisterOrganizationResult>;
} {
  return (
    "registerOrganizationAtomic" in store &&
    typeof store.registerOrganizationAtomic === "function"
  );
}

export async function registerOrganizationForApi(
  headers: Headers,
  input: RegisterOrganizationApiInput,
  dependencies: RegisterOrganizationForApiDependencies,
): Promise<RegisterOrganizationForApiResult> {
  const ownerUserId = readOwnerUserId(headers);

  try {
    if (supportsAtomicRegistration(dependencies.identityStore)) {
      return await dependencies.identityStore.registerOrganizationAtomic(
        {
          name: input.name,
          slug: input.slug,
          plan: input.plan,
          dataRegion: input.dataRegion,
          ownerUserId,
          ...(input.ownerEmail !== undefined ? { ownerEmail: input.ownerEmail } : {}),
        },
        dependencies,
      );
    }

    if (isOrganizationOwnerPreparer(dependencies.identityStore)) {
      await dependencies.identityStore.prepareOrganizationOwner(ownerUserId, input.ownerEmail);
    }

    return await registerOrganization(
      {
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        dataRegion: input.dataRegion,
        ownerUserId,
      },
      dependencies.identityStore,
      dependencies,
    );
  } catch (error) {
    throw mapRegistrationError(error);
  }
}
