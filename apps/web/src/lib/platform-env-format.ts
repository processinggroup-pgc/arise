export interface DetectedPlatformEnv {
  supabase: {
    available: boolean;
    projectRef: string;
    managedByVercelIntegration: boolean;
    source: "env" | "vercel_integration" | "missing";
  };
  vercel: {
    available: boolean;
    projectId: string;
    teamId: string;
    createsProjectPerInitiative: boolean;
    source: "env" | "missing";
  };
  resend: { available: boolean; fromEmail: string; source: "env" | "missing" };
  vercelManagedStackReady: boolean;
}

export function formatDetectedVercelSummary(vercel: DetectedPlatformEnv["vercel"]): string {
  if (!vercel.available) {
    return "Missing VERCEL_TOKEN and VERCEL_TEAM_ID (or VERCEL_PROJECT_ID)";
  }

  if (vercel.createsProjectPerInitiative) {
    return `Team ${vercel.teamId} — new Vercel project per initiative`;
  }

  if (vercel.projectId.length > 0) {
    return `Project ${vercel.projectId}`;
  }

  return "Linked Vercel runtime project";
}

export function formatDetectedSupabaseSummary(
  supabase: DetectedPlatformEnv["supabase"],
): string {
  if (!supabase.available) {
    return "Not in local env — use Vercel Supabase integration or add DATABASE_URL + NEXT_PUBLIC_SUPABASE_*";
  }

  if (supabase.managedByVercelIntegration) {
    return `Project ${supabase.projectRef} (synced via Vercel Supabase integration)`;
  }

  return `Detected project ${supabase.projectRef}`;
}
