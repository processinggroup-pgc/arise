import { describe, expect, it } from "vitest";

import {
  assertMatchingOrganization,
  createTenantContext,
  TenantScopeViolationError,
} from "./tenant-context.js";

describe("createTenantContext", () => {
  it("requires organization and user identifiers", () => {
    expect(
      createTenantContext({
        organizationId: "org_123",
        userId: "user_123",
        correlationId: "corr_123",
      }),
    ).toEqual({
      organizationId: "org_123",
      userId: "user_123",
      correlationId: "corr_123",
    });
  });

  it("rejects missing organization identifiers", () => {
    expect(() =>
      createTenantContext({
        organizationId: "   ",
        userId: "user_123",
      }),
    ).toThrow("Organization identifier is required");
  });
});

describe("assertMatchingOrganization", () => {
  it("allows access when the requested organization matches the tenant context", () => {
    expect(() => {
      assertMatchingOrganization(
        createTenantContext({
          organizationId: "org_123",
          userId: "user_123",
          correlationId: "corr_123",
        }),
        "org_123",
      );
    }).not.toThrow();
  });

  it("blocks cross-tenant organization access", () => {
    expect(() => {
      assertMatchingOrganization(
        createTenantContext({
          organizationId: "org_a",
          userId: "user_123",
          correlationId: "corr_123",
        }),
        "org_b",
      );
    }).toThrow(TenantScopeViolationError);
  });
});
