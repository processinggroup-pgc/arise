import { describe, expect, it } from "vitest";

import { createRepository } from "./repository.js";

describe("createRepository", () => {
  it("creates a connected GitHub repository scoped to a project", () => {
    const repository = createRepository(
      {
        organizationId: "org_123",
        projectId: "project_123",
        provider: "github",
        externalId: "123456789",
        fullName: "PgC-git/arise",
        defaultBranch: "main",
        installationId: "install_123",
      },
      {
        id: "repo_123",
        createdAt: new Date("2026-08-03T12:00:00.000Z"),
      },
    );

    expect(repository).toEqual({
      id: "repo_123",
      organizationId: "org_123",
      projectId: "project_123",
      provider: "github",
      externalId: "123456789",
      fullName: "PgC-git/arise",
      defaultBranch: "main",
      installationId: "install_123",
      status: "connected",
      createdAt: new Date("2026-08-03T12:00:00.000Z"),
    });
  });

  it("rejects repositories without a full name", () => {
    expect(() =>
      createRepository(
        {
          organizationId: "org_123",
          projectId: "project_123",
          provider: "github",
          externalId: "123456789",
          fullName: " ",
          defaultBranch: "main",
          installationId: "install_123",
        },
        {
          id: "repo_123",
          createdAt: new Date("2026-08-03T12:00:00.000Z"),
        },
      ),
    ).toThrow("Repository full name is required");
  });
});
