import { describe, expect, it } from "vitest";

import { advanceInitiativeState, createInitiative } from "./initiative.js";

describe("createInitiative", () => {
  it("creates an initiative in draft state", () => {
    const initiative = createInitiative(
      {
        organizationId: "org_123",
        title: "Improve cohort affordability",
        ownerId: "user_owner",
      },
      {
        id: "initiative_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(initiative.state).toBe("draft");
    expect(initiative.title).toBe("Improve cohort affordability");
  });
});

describe("advanceInitiativeState", () => {
  it("moves an initiative to the next workflow state", () => {
    const initiative = createInitiative(
      {
        organizationId: "org_123",
        title: "Improve cohort affordability",
        ownerId: "user_owner",
        state: "problem_captured",
      },
      {
        id: "initiative_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    const advanced = advanceInitiativeState(
      initiative,
      "research_complete",
      new Date("2026-08-03T13:00:00.000Z"),
    );

    expect(advanced.state).toBe("research_complete");
    expect(advanced.updatedAt.toISOString()).toBe("2026-08-03T13:00:00.000Z");
  });
});
