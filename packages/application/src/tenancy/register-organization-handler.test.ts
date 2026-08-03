import { describe, expect, it } from "vitest";

import { InMemoryIdentityStore } from "../identity/in-memory-identity-store.js";
import { TENANT_HEADERS } from "./tenant-context-error.js";
import { createRegisterOrganizationHandler } from "./register-organization-handler.js";

describe("createRegisterOrganizationHandler", () => {
  it("registers an organization from a JSON request body", async () => {
    const identityStore = new InMemoryIdentityStore();
    const handler = createRegisterOrganizationHandler({ identityStore });

    const response = await handler(
      new Request("http://localhost/api/v1/organizations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [TENANT_HEADERS.userId]: "user_owner",
        },
        body: JSON.stringify({
          name: "Processing Group",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      organization: {
        slug: "processing-group",
      },
      membership: {
        userId: "user_owner",
        role: "owner",
      },
    });
  });

  it("returns validation errors for invalid payloads", async () => {
    const handler = createRegisterOrganizationHandler(new InMemoryIdentityStore());

    const response = await handler(
      new Request("http://localhost/api/v1/organizations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [TENANT_HEADERS.userId]: "user_owner",
        },
        body: JSON.stringify({
          name: "",
          slug: "processing-group",
          plan: "starter",
          dataRegion: "us-east-1",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_registration",
      },
    });
  });
});
