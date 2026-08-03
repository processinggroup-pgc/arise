import { describe, expect, it } from "vitest";

import {
  buildAutomatedTestRef,
  createRequirementAcceptanceCriterion,
} from "./requirement-acceptance-criterion.js";

describe("createRequirementAcceptanceCriterion", () => {
  it("creates a GWT acceptance criterion with a stable trace reference", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const criterion = createRequirementAcceptanceCriterion(
      {
        requirementId: "requirement_123",
        organizationId: "org_123",
        given: "a tenant context for organization A",
        when: "memberships are listed",
        then: "only organization A memberships are returned",
        automatedTestRef: "WI-lineage1-REQ-1-AC-1",
      },
      {
        id: "criterion_123",
        createdAt,
      },
    );

    expect(criterion.automatedTestRef).toBe("WI-lineage1-REQ-1-AC-1");
    expect(criterion.given).toBe("a tenant context for organization A");
  });

  it("rejects invalid automated test references", () => {
    expect(() =>
      createRequirementAcceptanceCriterion(
        {
          requirementId: "requirement_123",
          organizationId: "org_123",
          given: "context",
          when: "action",
          then: "result",
          automatedTestRef: " bad ref ",
        },
        {
          id: "criterion_123",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Automated test reference is invalid");
  });
});

describe("buildAutomatedTestRef", () => {
  it("builds a deterministic trace reference for a requirement criterion", () => {
    expect(
      buildAutomatedTestRef({
        workItemLineageId: "lineage_123",
        requirementSequence: 2,
        criterionSequence: 1,
      }),
    ).toBe("WI-lineage1-REQ-2-AC-1");
  });
});
