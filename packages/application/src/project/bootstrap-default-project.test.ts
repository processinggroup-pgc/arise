import { describe, expect, it, vi } from "vitest";

import { bootstrapDefaultProject, supportsBootstrapDefaultProject } from "./bootstrap-default-project.js";

describe("bootstrapDefaultProject", () => {
  it("calls the bootstrap SQL helper with project fields", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const createdAt = new Date("2026-08-03T12:00:00.000Z");

    const project = await bootstrapDefaultProject(
      { query },
      {
        organizationId: "org_123",
        projectId: "project_123",
        name: "Default Project",
        description: "Primary delivery workspace",
        createdAt,
      },
    );

    expect(query).toHaveBeenCalledWith(
      "select public.arise_create_default_project($1, $2, $3, $4, $5)",
      ["org_123", "project_123", "Default Project", "Primary delivery workspace", createdAt],
    );
    expect(project).toMatchObject({
      id: "project_123",
      organizationId: "org_123",
      name: "Default Project",
      status: "active",
    });
  });
});

describe("supportsBootstrapDefaultProject", () => {
  it("detects stores that expose bootstrapDefaultProject", () => {
    expect(
      supportsBootstrapDefaultProject({
        bootstrapDefaultProject: async () => ({
          id: "project_123",
          organizationId: "org_123",
          name: "Default Project",
          description: "",
          status: "active",
          createdAt: new Date(),
        }),
      }),
    ).toBe(true);
    expect(supportsBootstrapDefaultProject({})).toBe(false);
  });
});
