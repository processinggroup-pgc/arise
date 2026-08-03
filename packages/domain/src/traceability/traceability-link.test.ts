import { describe, expect, it } from "vitest";

import { createTraceabilityLink } from "./traceability-link.js";

describe("createTraceabilityLink", () => {
  it("creates a tenant-owned link between traceability subjects", () => {
    const link = createTraceabilityLink(
      {
        organizationId: "org_123",
        workItemLineageId: "lineage_abc",
        sourceType: "automated_test",
        sourceId: "WI-lineage-REQ-1-AC-1",
        targetType: "code_artifact",
        targetId: "src/memberships/route.ts",
        relationship: "implements",
      },
      {
        id: "link_1",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(link).toEqual({
      id: "link_1",
      organizationId: "org_123",
      workItemLineageId: "lineage_abc",
      sourceType: "automated_test",
      sourceId: "WI-lineage-REQ-1-AC-1",
      targetType: "code_artifact",
      targetId: "src/memberships/route.ts",
      relationship: "implements",
      createdAt: new Date("2026-08-03T12:00:00.000Z"),
    });
  });

  it("rejects links with identical source and target", () => {
    expect(() =>
      createTraceabilityLink(
        {
          organizationId: "org_123",
          workItemLineageId: "lineage_abc",
          sourceType: "automated_test",
          sourceId: "same-ref",
          targetType: "automated_test",
          targetId: "same-ref",
          relationship: "implements",
        },
        {
          id: "link_1",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Traceability link source and target must differ");
  });
});
