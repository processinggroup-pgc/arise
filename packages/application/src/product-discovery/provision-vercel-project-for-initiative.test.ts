import { describe, expect, it } from "vitest";

import { FakeVercelProjectAdapter } from "@arise/integration-vercel";

import { provisionVercelProjectForInitiative } from "./provision-vercel-project-for-initiative.js";

describe("provisionVercelProjectForInitiative", () => {
  it("creates a Vercel project when projectId is empty", async () => {
    process.env["VERCEL_TOKEN"] = "test-token";

    const result = await provisionVercelProjectForInitiative(
      {
        initiativeId: "initiative-123456",
        initiativeTitle: "Cohort Affordability MVP",
        platformConnections: {
          stackMode: "vercel_managed",
          supabase: {
            status: "connected",
            projectRef: "provisioned-via-vercel-supabase-integration",
            databaseUrlRef: "vercel:supabase_integration:POSTGRES_URL",
            anonKeyRef: "vercel:supabase_integration:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          },
          vercel: {
            status: "connected",
            projectId: "",
            teamId: "team_abc",
            tokenRef: "env:VERCEL_TOKEN",
          },
          resend: {
            status: "connected",
            apiKeyRef: "env:RESEND_API_KEY",
            fromEmail: "hello@example.com",
          },
          github: {
            status: "connected",
            repositoryRef: "vercel:github_git_repository",
          },
          connectedAt: new Date(),
        },
      },
      new FakeVercelProjectAdapter(),
    );

    expect(result).toBeDefined();
    expect(result?.projectId).toMatch(/^prj_fake_/);
    expect(result?.platformConnections.vercel.projectId).toBe(result?.projectId);
  });
});
