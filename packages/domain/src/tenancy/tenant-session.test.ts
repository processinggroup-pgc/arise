import { describe, expect, it } from "vitest";

import { TENANT_DATABASE_ROLE, TENANT_SESSION_KEYS } from "./tenant-session.js";

describe("tenant session constants", () => {
  it("defines stable postgres session keys for tenant context", () => {
    expect(TENANT_SESSION_KEYS.organizationId).toBe("app.current_organization_id");
    expect(TENANT_SESSION_KEYS.userId).toBe("app.current_user_id");
    expect(TENANT_DATABASE_ROLE).toBe("arise_app");
  });
});
