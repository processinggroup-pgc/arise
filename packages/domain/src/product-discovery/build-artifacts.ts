export type PlatformConnectionStatus = "pending" | "connected" | "manual";

export interface SupabaseConnection {
  status: PlatformConnectionStatus;
  projectRef: string;
  databaseUrlRef: string;
  anonKeyRef: string;
}

export interface VercelConnection {
  status: PlatformConnectionStatus;
  projectId: string;
  teamId: string;
  tokenRef: string;
}

export interface ResendConnection {
  status: PlatformConnectionStatus;
  apiKeyRef: string;
  fromEmail: string;
}

export interface GitHubConnection {
  status: PlatformConnectionStatus;
  repositoryRef: string;
}

export type PlatformStackMode = "manual" | "vercel_managed";

export interface PlatformConnections {
  stackMode: PlatformStackMode;
  supabase: SupabaseConnection;
  vercel: VercelConnection;
  resend: ResendConnection;
  github?: GitHubConnection;
  connectedAt: Date;
}

export interface BuildTask {
  title: string;
  status: "pending" | "in_progress" | "complete" | "failed";
  workItemId?: string;
}

export interface MvpBuildPlan {
  summary: string;
  tasks: BuildTask[];
  startedAt: Date;
  completedAt?: Date;
  vercelProjectUrl?: string;
}

export interface UatChecklistItem {
  id: string;
  description: string;
  passed: boolean;
}

export interface UatReport {
  checklist: UatChecklistItem[];
  summary: string;
  testedAt: Date;
}

export interface EnhancementBacklogItem {
  id: string;
  title: string;
  source: "not_to_build" | "gap_analysis" | "deferred_feature";
  inMvp: boolean;
  applied: boolean;
}

export interface BuildBundle {
  id: string;
  initiativeId: string;
  organizationId: string;
  platformConnections?: PlatformConnections;
  projectId?: string;
  buildPlan?: MvpBuildPlan;
  uatReport?: UatReport;
  enhancementsBacklog: EnhancementBacklogItem[];
  updatedAt: Date;
}

export function createBuildBundle(input: {
  id: string;
  initiativeId: string;
  organizationId: string;
  updatedAt: Date;
}): BuildBundle {
  return {
    id: input.id,
    initiativeId: input.initiativeId,
    organizationId: input.organizationId,
    enhancementsBacklog: [],
    updatedAt: input.updatedAt,
  };
}

export function mergeBuildBundle(
  bundle: BuildBundle,
  patch: Partial<Omit<BuildBundle, "id" | "initiativeId" | "organizationId">>,
  updatedAt: Date,
): BuildBundle {
  return { ...bundle, ...patch, updatedAt };
}
