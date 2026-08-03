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

function extractSupabaseProjectRef(databaseUrl: string | undefined): string {
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return "";
  }

  const match = databaseUrl.match(/postgres(?:ql)?:\/\/postgres\.([^:/]+)/);
  if (match?.[1] !== undefined) {
    return match[1];
  }

  const hostMatch = databaseUrl.match(/@db\.([^.]+)\.supabase\.co/);
  return hostMatch?.[1] ?? "";
}

function resolveSupabaseEnv(env: NodeJS.ProcessEnv): {
  databaseUrl: string | undefined;
  supabaseUrl: string | undefined;
  anonKey: string | undefined;
  managedByVercelIntegration: boolean;
} {
  const databaseUrl =
    env["DATABASE_URL"] ??
    env["DIRECT_URL"] ??
    env["POSTGRES_URL"] ??
    env["POSTGRES_URL_NON_POOLING"];
  const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"] ?? env["SUPABASE_URL"];
  const anonKey =
    env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
    env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??
    env["SUPABASE_ANON_KEY"] ??
    env["SUPABASE_PUBLISHABLE_KEY"];
  const managedByVercelIntegration =
    (env["POSTGRES_URL"] !== undefined ||
      env["SUPABASE_URL"] !== undefined ||
      env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] !== undefined) &&
    databaseUrl !== undefined &&
    supabaseUrl !== undefined &&
    anonKey !== undefined;

  return { databaseUrl, supabaseUrl, anonKey, managedByVercelIntegration };
}

export function detectPlatformEnvFromProcessEnv(
  env: NodeJS.ProcessEnv = process.env,
): DetectedPlatformEnv {
  const { databaseUrl, supabaseUrl, anonKey, managedByVercelIntegration } = resolveSupabaseEnv(env);
  const supabaseAvailable =
    databaseUrl !== undefined &&
    databaseUrl.length > 0 &&
    supabaseUrl !== undefined &&
    supabaseUrl.length > 0 &&
    anonKey !== undefined &&
    anonKey.length > 0;

  const vercelToken = env["VERCEL_TOKEN"] ?? env["VERCEL_ACCESS_TOKEN"] ?? "";
  const vercelTeamId = env["VERCEL_TEAM_ID"] ?? "";
  const vercelProjectId = env["VERCEL_PROJECT_ID"] ?? "";
  const onVercelRuntime = env["VERCEL_URL"] !== undefined || env["VERCEL"] !== undefined;
  const vercelAvailable =
    vercelToken.length > 0 &&
    (vercelTeamId.length > 0 || vercelProjectId.length > 0 || onVercelRuntime);
  const createsProjectPerInitiative =
    vercelAvailable && vercelTeamId.length > 0 && vercelProjectId.length === 0;

  const resendKey = env["RESEND_API_KEY"] ?? "";
  const fromEmail = env["RESEND_FROM_EMAIL"] ?? env["EMAIL_FROM"] ?? "";
  const resendAvailable = resendKey.length > 0 && fromEmail.length > 0;
  const vercelManagedStackReady = vercelAvailable && resendAvailable;

  return {
    supabase: {
      available: supabaseAvailable,
      projectRef:
        extractSupabaseProjectRef(databaseUrl) ||
        (supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1] ?? ""),
      managedByVercelIntegration,
      source: supabaseAvailable
        ? managedByVercelIntegration
          ? "vercel_integration"
          : "env"
        : "missing",
    },
    vercel: {
      available: vercelAvailable,
      projectId: vercelProjectId,
      teamId: vercelTeamId,
      createsProjectPerInitiative,
      source: vercelAvailable ? "env" : "missing",
    },
    resend: {
      available: resendAvailable,
      fromEmail,
      source: resendAvailable ? "env" : "missing",
    },
    vercelManagedStackReady,
  };
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
