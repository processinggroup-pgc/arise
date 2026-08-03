import { describe, expect, it } from "vitest";

import { inferTestedFilePath, isTestFilePath } from "./repository-test-map.js";

describe("repository test map helpers", () => {
  it("detects test files and infers the tested source path", () => {
    expect(isTestFilePath("src/memberships/route.test.ts")).toBe(true);
    expect(inferTestedFilePath("src/memberships/route.test.ts")).toBe("src/memberships/route.ts");
  });

  it("supports spec files with tsx extensions", () => {
    expect(isTestFilePath("src/app/page.spec.tsx")).toBe(true);
    expect(inferTestedFilePath("src/app/page.spec.tsx")).toBe("src/app/page.tsx");
  });
});
