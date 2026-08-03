import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@arise/domain": join(repositoryRoot, "packages/domain/src/index.ts"),
      "@arise/application": join(repositoryRoot, "packages/application/src/index.ts"),
      "@arise/integration-github": join(repositoryRoot, "packages/integration-github/src/index.ts"),
      "@arise/integration-sandbox": join(repositoryRoot, "packages/integration-sandbox/src/index.ts"),
      "@arise/test-support": join(repositoryRoot, "packages/test-support/src/index.ts"),
      "@": join(repositoryRoot, "apps/web/src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "tests/architecture/**",
            "tests/e2e/**",
            "tests/examples/**",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "architecture",
          include: ["tests/architecture/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/**/*.integration.test.ts"],
          globalSetup: ["tests/security/integration-global-setup.ts"],
          testTimeout: 30_000,
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
    ],
  },
});
