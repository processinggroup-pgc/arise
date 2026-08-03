import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface PackageManifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const repositoryRoot = join(import.meta.dirname, "..", "..");

function listWorkspacePackages(
  segment: "apps" | "packages",
): Array<{ manifest: PackageManifest; segment: "apps" | "packages" }> {
  const directory = join(repositoryRoot, segment);

  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory())
    .map((entryPath) => join(entryPath, "package.json"))
    .filter((manifestPath) => existsSync(manifestPath))
    .map((manifestPath) => ({
      segment,
      manifest: JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest,
    }));
}

function allDependencies(manifest: PackageManifest): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ];
}

describe("architecture package boundaries", () => {
  it("keeps library packages free of app and integration dependencies", () => {
    const packages = listWorkspacePackages("packages");
    const integrationDependents = new Set(["@arise/application"]);

    for (const { manifest } of packages) {
      for (const dependency of allDependencies(manifest)) {
        if (
          dependency.startsWith("@arise/integration-") &&
          !integrationDependents.has(manifest.name)
        ) {
          expect(false, `${manifest.name} must not depend on ${dependency}`).toBe(true);
        }

        expect(
          dependency === "@arise/web" || dependency === "@arise/worker",
          `${manifest.name} must not depend on ${dependency}`,
        ).toBe(false);
      }
    }
  });

  it("prevents apps from depending directly on integration adapters", () => {
    const apps = listWorkspacePackages("apps");

    for (const { manifest } of apps) {
      for (const dependency of allDependencies(manifest)) {
        expect(
          dependency.startsWith("@arise/integration-"),
          `${manifest.name} must not depend on ${dependency}`,
        ).toBe(false);
      }
    }
  });
});

describe("repository foundation layout", () => {
  it("includes the milestone zero monorepo directories", () => {
    const requiredDirectories = [
      "apps/web",
      "apps/worker",
      "packages/domain",
      "packages/application",
      "packages/integration-github",
      "packages/integration-sandbox",
      "packages/test-support",
      "supabase/migrations",
      "tests/architecture",
      "docs",
    ];

    for (const relativePath of requiredDirectories) {
      expect(statSync(join(repositoryRoot, relativePath)).isDirectory()).toBe(true);
    }

    expect(statSync(join(repositoryRoot, "CONTRIBUTING.md")).isFile()).toBe(true);
  });
});
