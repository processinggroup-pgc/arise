import { describe, expect, it } from "vitest";

import { createWorkerHealthCheck } from "./index.js";

describe("createWorkerHealthCheck", () => {
  it("reports readiness from environment validation", () => {
    const result = createWorkerHealthCheck({ NODE_ENV: "test" });

    expect(result.ready).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
