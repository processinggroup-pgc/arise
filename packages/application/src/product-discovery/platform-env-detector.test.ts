import { describe, expect, it } from "vitest";

import {
  detectPlatformEnvFromProcessEnv,
  formatDetectedSupabaseSummary,
  formatDetectedVercelSummary,
} from "./platform-env-detector.js";

describe("detectPlatformEnvFromProcessEnv", () => {
  it("treats Vercel as available with token and team id only", () => {
    const detected = detectPlatformEnvFromProcessEnv({
      VERCEL_TOKEN: "test-token",
      VERCEL_TEAM_ID: "team_3GCSUNZBPT5KXd41oItP40Gk",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "hello@example.com",
    });

    expect(detected.vercel.available).toBe(true);
    expect(detected.vercel.teamId).toBe("team_3GCSUNZBPT5KXd41oItP40Gk");
    expect(detected.vercel.projectId).toBe("");
    expect(detected.vercel.createsProjectPerInitiative).toBe(true);
    expect(detected.vercelManagedStackReady).toBe(true);
  });

  it("detects Supabase env vars synced by the Vercel integration", () => {
    const detected = detectPlatformEnvFromProcessEnv({
      POSTGRES_URL: "postgresql://postgres.abc:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });

    expect(detected.supabase.available).toBe(true);
    expect(detected.supabase.managedByVercelIntegration).toBe(true);
    expect(detected.supabase.source).toBe("vercel_integration");
  });

  it("uses a fixed project when VERCEL_PROJECT_ID is set", () => {
    const detected = detectPlatformEnvFromProcessEnv({
      VERCEL_TOKEN: "test-token",
      VERCEL_TEAM_ID: "team_abc",
      VERCEL_PROJECT_ID: "prj_fixed",
    });

    expect(detected.vercel.available).toBe(true);
    expect(detected.vercel.projectId).toBe("prj_fixed");
    expect(detected.vercel.createsProjectPerInitiative).toBe(false);
  });

  it("requires a token for Vercel availability", () => {
    const detected = detectPlatformEnvFromProcessEnv({
      VERCEL_TEAM_ID: "team_abc",
    });

    expect(detected.vercel.available).toBe(false);
  });
});

describe("formatDetectedVercelSummary", () => {
  it("describes per-initiative team setup", () => {
    expect(
      formatDetectedVercelSummary({
        available: true,
        projectId: "",
        teamId: "team_abc",
        createsProjectPerInitiative: true,
        source: "env",
      }),
    ).toContain("new Vercel project per initiative");
  });
});

describe("formatDetectedSupabaseSummary", () => {
  it("describes Vercel integration synced vars", () => {
    expect(
      formatDetectedSupabaseSummary({
        available: true,
        projectRef: "abc",
        managedByVercelIntegration: true,
        source: "vercel_integration",
      }),
    ).toContain("Vercel Supabase integration");
  });
});
