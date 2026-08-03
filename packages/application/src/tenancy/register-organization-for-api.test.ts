import { describe, expect, it } from "vitest";

import { InMemoryIdentityStore } from "../identity/in-memory-identity-store.js";
import { registerOrganization } from "../identity/register-organization.js";
import { TENANT_HEADERS } from "./tenant-context-error.js";
import {
  OrganizationRegistrationError,
  registerOrganizationForApi,
} from "./register-organization-for-api.js";

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

describe("registerOrganizationForApi", () => {
  it("creates an organization for the owner user id header", async () => {
    const identityStore = new InMemoryIdentityStore();

    const result = await registerOrganizationForApi(
      new Headers({
        [TENANT_HEADERS.userId]: "user_owner",
      }),
      {
        name: "Processing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
      },
      {
        identityStore,
        ...operationContext,
      },
    );

    expect(result.organization.slug).toBe("processing-group");
    expect(result.membership).toMatchObject({
      organizationId: result.organization.id,
      userId: "user_owner",
      role: "owner",
      status: "active",
    });
  });

  it("requires the owner user id header", async () => {
    const identityStore = new InMemoryIdentityStore();

    await expect(
      registerOrganizationForApi(
        new Headers(),
        {
          name: "Processing Group",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        },
        {
          identityStore,
          ...operationContext,
        },
      ),
    ).rejects.toMatchObject({
      code: "missing_owner_user",
      statusCode: 400,
    });
  });

  it("rejects invalid registration payloads", async () => {
    const identityStore = new InMemoryIdentityStore();

    await expect(
      registerOrganizationForApi(
        new Headers({
          [TENANT_HEADERS.userId]: "user_owner",
        }),
        {
          name: "",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        },
        {
          identityStore,
          ...operationContext,
        },
      ),
    ).rejects.toBeInstanceOf(OrganizationRegistrationError);
  });

  it("returns a conflict when the slug is already in use", async () => {
    const identityStore = new InMemoryIdentityStore();

    await registerOrganization(
      {
        name: "Existing Group",
        slug: "processing-group",
        plan: "starter",
        dataRegion: "us-east-1",
        ownerUserId: "user_existing",
      },
      identityStore,
      {
        createId: () => "org_existing",
        now: () => new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    await expect(
      registerOrganizationForApi(
        new Headers({
          [TENANT_HEADERS.userId]: "user_owner",
        }),
        {
          name: "Processing Group",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        },
        {
          identityStore,
          ...operationContext,
        },
      ),
    ).rejects.toMatchObject({
      code: "organization_slug_in_use",
      statusCode: 409,
    });
  });
});
