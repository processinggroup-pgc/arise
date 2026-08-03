import { describe, expect, it } from "vitest";

import { buildTenantContext } from "./tenant-context.js";

describe("buildTenantContext", () => {
  it("creates explicit tenant identity defaults for tests", () => {
    expect(buildTenantContext()).toEqual({
      organizationId: "org_test",
      userId: "user_test",
      correlationId: "corr_test",
    });
  });
});
