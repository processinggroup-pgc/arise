import { describe, expect, it } from "vitest";

import { createProject } from "./project.js";

describe("createProject", () => {
  it("creates an active project for an organization", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const project = createProject(
      {
        organizationId: "org_123",
        name: "Customer Portal",
        description: "Next.js delivery workspace",
      },
      {
        id: "project_123",
        createdAt,
      },
    );

    expect(project).toEqual({
      id: "project_123",
      organizationId: "org_123",
      name: "Customer Portal",
      description: "Next.js delivery workspace",
      status: "active",
      createdAt,
    });
  });

  it("requires an organization identifier", () => {
    expect(() =>
      createProject(
        {
          organizationId: "  ",
          name: "Customer Portal",
        },
        {
          id: "project_123",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Organization identifier is required");
  });
});
