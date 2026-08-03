import { describe, expect, it } from "vitest";

import { extractDependenciesFromSource } from "./dependency-extraction.js";

describe("extractDependenciesFromSource", () => {
  it("extracts relative and package imports", () => {
    const knownPaths = new Set(["src/memberships/route.ts", "src/memberships/service.ts"]);

    const dependencies = extractDependenciesFromSource(
      `import { listMemberships } from "./service";
import type { TenantContext } from "@arise/domain";`,
      "src/memberships/route.ts",
      knownPaths,
    );

    expect(dependencies).toEqual([
      { target: "src/memberships/service.ts", kind: "relative_import", line: 1 },
      { target: "@arise/domain", kind: "package_import", line: 2 },
    ]);
  });
});
