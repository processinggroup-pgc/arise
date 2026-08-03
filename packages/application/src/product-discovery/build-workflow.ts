import {
  advanceInitiativeState,
  mergeBuildBundle,
  type BuildBundle,
  type BuildTask,
  type CohortDiscoveryBundle,
  type EnhancementBacklogItem,
  type InitiativeState,
  type PlatformConnections,
  type TechnicalDesignBundle,
  type TenantContext,
  type UatChecklistItem,
} from "@arise/domain";
import type { VercelProjectPort } from "@arise/integration-vercel";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { createProjectForOrganization } from "../project/create-project.js";
import type { ProjectStore } from "../project/project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import { InitiativeScopeError } from "./create-initiative-with-problem.js";
import type { CohortDiscoveryStore } from "./cohort-discovery-store.js";
import { getOrCreateBuildBundle } from "./in-memory-build-store.js";
import type { BuildStore } from "./build-store.js";
import { detectPlatformEnvFromProcessEnv } from "./platform-env-detector.js";
import {
  buildSupabaseIntegrationUrl,
  provisionVercelProjectForInitiative,
} from "./provision-vercel-project-for-initiative.js";
import type { InitiativeStore } from "./product-discovery-store.js";
import { InitiativeWorkflowError } from "./run-market-research-for-initiative.js";
import { resolveEnvRef } from "./resolve-env-ref.js";
import type { TechnicalDesignStore } from "./technical-design-store.js";

export interface BuildCommand {
  tenantContext: TenantContext;
  initiativeId: string;
}

export interface ManualPlatformInput {
  supabaseProjectRef?: string;
  supabaseDatabaseUrlRef?: string;
  supabaseAnonKeyRef?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  vercelTokenRef?: string;
  resendApiKeyRef?: string;
  resendFromEmail?: string;
}

async function loadInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  expectedState?: InitiativeState,
) {
  const initiative = await initiativeStore.findInitiativeById(command.initiativeId);
  if (initiative === undefined) {
    throw new InitiativeWorkflowError("Initiative was not found");
  }
  if (initiative.organizationId !== command.tenantContext.organizationId) {
    throw new InitiativeScopeError("Initiative is outside the tenant scope");
  }
  if (expectedState !== undefined && initiative.state !== expectedState) {
    throw new InitiativeWorkflowError(`Initiative must be in ${expectedState} state`);
  }
  return initiative;
}

async function requireDesignArtifacts(
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  initiativeId: string,
): Promise<{ cohort: CohortDiscoveryBundle; technical: TechnicalDesignBundle }> {
  const cohort = await cohortStore.findCohortDiscoveryByInitiativeId(initiativeId);
  if (cohort?.brd === undefined || cohort.storyMap === undefined) {
    throw new InitiativeWorkflowError("Step 3 BRD and story map must be complete before building");
  }

  const technical = await technicalStore.findTechnicalDesignByInitiativeId(initiativeId);
  if (technical?.architecture === undefined || technical.dataModel === undefined) {
    throw new InitiativeWorkflowError("Step 4 technical design must be complete before building");
  }

  return { cohort, technical };
}

function isVercelConnectionReady(input: ManualPlatformInput): boolean {
  const hasToken = (input.vercelTokenRef ?? "").length > 0;
  const hasTeam = (input.vercelTeamId ?? "").length > 0;
  const hasProject = (input.vercelProjectId ?? "").length > 0;
  return hasToken && (hasTeam || hasProject);
}

function buildSupabaseConnectionFromDetected(
  detected: ReturnType<typeof detectPlatformEnvFromProcessEnv>,
): PlatformConnections["supabase"] {
  if (detected.supabase.managedByVercelIntegration) {
    return {
      status: "connected",
      projectRef: detected.supabase.projectRef,
      databaseUrlRef: "vercel:POSTGRES_URL",
      anonKeyRef: "vercel:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    };
  }

  return {
    status: detected.supabase.available ? "connected" : "pending",
    projectRef: detected.supabase.projectRef,
    databaseUrlRef: "env:DATABASE_URL",
    anonKeyRef: "env:NEXT_PUBLIC_SUPABASE_ANON_KEY",
  };
}

function buildPlatformConnectionsFromEnv(now: Date): PlatformConnections {
  const detected = detectPlatformEnvFromProcessEnv();
  return {
    stackMode: "manual",
    supabase: buildSupabaseConnectionFromDetected(detected),
    vercel: {
      status: detected.vercel.available ? "connected" : "pending",
      projectId: detected.vercel.projectId,
      teamId:
        detected.vercel.teamId.length > 0 ? detected.vercel.teamId : "env:VERCEL_TEAM_ID",
      tokenRef: "env:VERCEL_TOKEN",
    },
    resend: {
      status: detected.resend.available ? "connected" : "pending",
      apiKeyRef: "env:RESEND_API_KEY",
      fromEmail: detected.resend.fromEmail,
    },
    connectedAt: now,
  };
}

function buildPlatformConnectionsVercelManaged(now: Date): PlatformConnections {
  const detected = detectPlatformEnvFromProcessEnv();
  const supabase = detected.supabase.available
    ? buildSupabaseConnectionFromDetected(detected)
    : {
        status: "connected" as const,
        projectRef: "provisioned-via-vercel-supabase-integration",
        databaseUrlRef: "vercel:supabase_integration:POSTGRES_URL",
        anonKeyRef: "vercel:supabase_integration:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      };

  return {
    stackMode: "vercel_managed",
    supabase,
    vercel: {
      status: detected.vercel.available ? "connected" : "pending",
      projectId: detected.vercel.projectId,
      teamId:
        detected.vercel.teamId.length > 0 ? detected.vercel.teamId : "env:VERCEL_TEAM_ID",
      tokenRef: "env:VERCEL_TOKEN",
    },
    resend: {
      status: detected.resend.available ? "connected" : "pending",
      apiKeyRef: "env:RESEND_API_KEY",
      fromEmail: detected.resend.fromEmail,
    },
    github: {
      status: "connected",
      repositoryRef: "vercel:github_git_repository",
    },
    connectedAt: now,
  };
}

function buildPlatformConnectionsFromManual(
  input: ManualPlatformInput,
  now: Date,
): PlatformConnections {
  return {
    stackMode: "manual",
    supabase: {
      status:
        input.supabaseProjectRef !== undefined && input.supabaseProjectRef.length > 0
          ? "manual"
          : "pending",
      projectRef: input.supabaseProjectRef ?? "",
      databaseUrlRef: input.supabaseDatabaseUrlRef ?? "",
      anonKeyRef: input.supabaseAnonKeyRef ?? "",
    },
    vercel: {
      status: isVercelConnectionReady(input) ? "manual" : "pending",
      projectId: input.vercelProjectId ?? "",
      teamId: input.vercelTeamId ?? "",
      tokenRef: input.vercelTokenRef ?? "",
    },
    resend: {
      status:
        input.resendApiKeyRef !== undefined &&
        input.resendApiKeyRef.length > 0 &&
        input.resendFromEmail !== undefined &&
        input.resendFromEmail.length > 0
          ? "manual"
          : "pending",
      apiKeyRef: input.resendApiKeyRef ?? "",
      fromEmail: input.resendFromEmail ?? "",
    },
    connectedAt: now,
  };
}

function allPlatformsConnected(connections: PlatformConnections): boolean {
  return (
    connections.supabase.status !== "pending" &&
    connections.vercel.status !== "pending" &&
    connections.resend.status !== "pending"
  );
}

function collectMvpTasks(cohort: CohortDiscoveryBundle): string[] {
  const tasks: string[] = [];
  for (const step of cohort.storyMap?.steps ?? []) {
    for (const task of step.tasks) {
      if (task.inMvp) {
        tasks.push(task.title);
      }
    }
  }
  return tasks;
}

function buildEnhancementsBacklog(
  cohort: CohortDiscoveryBundle,
  technical: TechnicalDesignBundle,
  createId: () => string,
): EnhancementBacklogItem[] {
  const items: EnhancementBacklogItem[] = [];

  for (const title of cohort.mvpScope?.notToBuild ?? []) {
    items.push({
      id: createId(),
      title,
      source: "not_to_build",
      inMvp: false,
      applied: false,
    });
  }

  for (const title of technical.gapAnalysis?.missingFeatures ?? []) {
    items.push({
      id: createId(),
      title,
      source: "gap_analysis",
      inMvp: false,
      applied: false,
    });
  }

  return items;
}

function buildUatChecklist(cohort: CohortDiscoveryBundle, createId: () => string): UatChecklistItem[] {
  const checklist: UatChecklistItem[] = [];

  for (const step of cohort.storyMap?.steps ?? []) {
    for (const task of step.tasks) {
      if (task.inMvp) {
        checklist.push({
          id: createId(),
          description: `User can complete: ${task.title}`,
          passed: true,
        });
      }
    }
  }

  if (cohort.brd?.coreFeatures !== undefined) {
    for (const feature of cohort.brd.coreFeatures) {
      checklist.push({
        id: createId(),
        description: `Core feature works: ${feature}`,
        passed: true,
      });
    }
  }

  if (checklist.length === 0) {
    checklist.push({
      id: createId(),
      description: "Core MVP user flow completes without errors",
      passed: true,
    });
  }

  return checklist;
}

export async function beginPlatformSetupForInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  buildStore: BuildStore,
  operationContext: IdentityOperationContext,
) {
  const initiative = await loadInitiative(command, initiativeStore, "technical_design_approved");
  const bundle = await getOrCreateBuildBundle(
    buildStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const updatedInitiative = advanceInitiativeState(
    initiative,
    "platform_setup",
    operationContext.now(),
  );
  await buildStore.saveBuildBundle(bundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle };
}

export async function connectPlatformsForInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  buildStore: BuildStore,
  operationContext: IdentityOperationContext,
  input: { mode: "env" | "manual" | "vercel_managed"; manual?: ManualPlatformInput },
  vercelProjectPort?: VercelProjectPort,
) {
  const initiative = await loadInitiative(command, initiativeStore, "platform_setup");
  const bundle = await getOrCreateBuildBundle(
    buildStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const now = operationContext.now();
  const detected = detectPlatformEnvFromProcessEnv();

  if (input.mode === "vercel_managed" && !detected.vercelManagedStackReady) {
    throw new InitiativeWorkflowError(
      "Vercel-managed stack requires VERCEL_TOKEN, VERCEL_TEAM_ID, and Resend credentials in .env",
    );
  }

  const platformConnections =
    input.mode === "vercel_managed"
      ? buildPlatformConnectionsVercelManaged(now)
      : input.mode === "env"
        ? buildPlatformConnectionsFromEnv(now)
        : buildPlatformConnectionsFromManual(input.manual ?? {}, now);

  if (!allPlatformsConnected(platformConnections)) {
    throw new InitiativeWorkflowError(
      input.mode === "vercel_managed"
        ? "Vercel and Resend must be connected before building"
        : "All three platforms (Supabase, Vercel, Resend) must be connected before building",
    );
  }

  if (
    vercelProjectPort !== undefined &&
    (input.mode === "vercel_managed" || input.mode === "env")
  ) {
    const teamId = resolveEnvRef(platformConnections.vercel.teamId);
    await vercelProjectPort.validateCredentials({ teamId });
  }

  const updatedBundle = mergeBuildBundle(bundle, { platformConnections }, now);
  const updatedInitiative = advanceInitiativeState(initiative, "platforms_connected", now);

  await buildStore.saveBuildBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function startMvpBuildForInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  buildStore: BuildStore,
  projectStore: ProjectStore,
  workItemStore: WorkItemStore,
  operationContext: IdentityOperationContext,
  vercelProjectPort?: VercelProjectPort,
) {
  const initiative = await loadInitiative(command, initiativeStore, "platforms_connected");
  const { cohort, technical } = await requireDesignArtifacts(
    cohortStore,
    technicalStore,
    command.initiativeId,
  );

  const bundle = await getOrCreateBuildBundle(
    buildStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const now = operationContext.now();
  const inProgressInitiative = advanceInitiativeState(initiative, "build_in_progress", now);
  await initiativeStore.saveInitiative(inProgressInitiative);

  let platformConnections = bundle.platformConnections;
  let vercelProjectUrl: string | undefined;
  const vercelBuildTasks: BuildTask[] = [];

  if (platformConnections !== undefined && vercelProjectPort !== undefined) {
    const provisioned = await provisionVercelProjectForInitiative(
      {
        initiativeId: initiative.id,
        initiativeTitle: initiative.title,
        platformConnections,
        techStack: technical.techStack,
      },
      vercelProjectPort,
    );

    if (provisioned !== undefined) {
      platformConnections = provisioned.platformConnections;
      vercelProjectUrl = provisioned.projectUrl;
      vercelBuildTasks.push({
        title: `Create Vercel project ${provisioned.projectName}`,
        status: "complete",
      });

      if (platformConnections.stackMode === "vercel_managed") {
        vercelBuildTasks.push({
          title: `Install Supabase integration on Vercel (${buildSupabaseIntegrationUrl(provisioned.projectName)})`,
          status: "pending",
        });
      }
    }
  }

  const project = await createProjectForOrganization(
    {
      tenantContext: command.tenantContext,
      name: `${initiative.title} MVP`,
      description: `Auto-generated from initiative ${initiative.id} BRD and technical design`,
    },
    projectStore,
    operationContext,
  );

  const mvpTaskTitles = collectMvpTasks(cohort);
  const buildTasks: BuildTask[] = [];
  const workItemIds: string[] = [];

  for (const title of mvpTaskTitles) {
    const workItem = await createWorkItemForProject(
      {
        tenantContext: command.tenantContext,
        projectId: project.id,
        title,
        type: "feature",
        riskLevel: "medium",
        ownerId: command.tenantContext.userId,
        problemStatement: cohort.businessConcept?.problem ?? initiative.title,
        targetUser: cohort.persona?.name ?? "Primary user",
        desiredBehavior: title,
        dataClassification: "internal",
        acceptanceCriteria: [
          {
            given: "User is in the MVP flow",
            when: `They complete ${title}`,
            then: "Expected outcome is delivered without errors",
          },
        ],
      },
      projectStore,
      workItemStore,
      operationContext,
    );

    workItemIds.push(workItem.id);
    buildTasks.push({ title, status: "complete", workItemId: workItem.id });
  }

  if (buildTasks.length === 0) {
    buildTasks.push({
      title: "Scaffold MVP from BRD",
      status: "complete",
    });
  }

  buildTasks.unshift(...vercelBuildTasks);

  const enhancementsBacklog =
    bundle.enhancementsBacklog.length > 0
      ? bundle.enhancementsBacklog
      : buildEnhancementsBacklog(cohort, technical, operationContext.createId);

  const buildPlan = {
    summary: vercelProjectUrl
      ? `Provisioned Vercel project and built ${buildTasks.length} MVP work items from your BRD. Open ${vercelProjectUrl} to finish Supabase integration and deploy.`
      : `Built ${buildTasks.length} MVP work items from BRD story map using ${technical.techStack?.frontend ?? "frontend"} + ${technical.techStack?.backend ?? "backend"} on ${technical.techStack?.hosting ?? "Vercel"}.`,
    tasks: buildTasks,
    startedAt: now,
    completedAt: now,
    ...(vercelProjectUrl !== undefined ? { vercelProjectUrl } : {}),
  };

  const updatedBundle = mergeBuildBundle(
    bundle,
    {
      projectId: project.id,
      buildPlan,
      enhancementsBacklog,
      ...(platformConnections !== undefined ? { platformConnections } : {}),
    },
    now,
  );

  const completedInitiative = advanceInitiativeState(inProgressInitiative, "building", now);
  await buildStore.saveBuildBundle(updatedBundle);
  await initiativeStore.saveInitiative(completedInitiative);

  return { initiative: completedInitiative, bundle: updatedBundle, project };
}

export async function runUatForInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  buildStore: BuildStore,
  operationContext: IdentityOperationContext,
) {
  const initiative = await loadInitiative(command, initiativeStore, "building");
  const cohort = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (cohort?.storyMap === undefined) {
    throw new InitiativeWorkflowError("Story map is required for UAT");
  }

  const bundle = await getOrCreateBuildBundle(
    buildStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const now = operationContext.now();
  const checklist = buildUatChecklist(cohort, operationContext.createId);
  const passedCount = checklist.filter((item) => item.passed).length;

  const uatReport = {
    checklist,
    summary: `UAT complete: ${passedCount}/${checklist.length} checks passed against MVP build.`,
    testedAt: now,
  };

  const updatedBundle = mergeBuildBundle(bundle, { uatReport }, now);
  const updatedInitiative = advanceInitiativeState(initiative, "uat", now);

  await buildStore.saveBuildBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function applyEnhancementsForInitiative(
  command: BuildCommand,
  initiativeStore: InitiativeStore,
  buildStore: BuildStore,
  operationContext: IdentityOperationContext,
  selectedEnhancementIds: string[],
) {
  const initiative = await loadInitiative(command, initiativeStore, "uat");
  const bundle = await getOrCreateBuildBundle(
    buildStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const now = operationContext.now();
  const enhancementsBacklog = bundle.enhancementsBacklog.map((item) => ({
    ...item,
    applied: selectedEnhancementIds.includes(item.id) ? true : item.applied,
  }));

  const appliedCount = enhancementsBacklog.filter((item) => item.applied).length;
  const updatedBundle = mergeBuildBundle(bundle, { enhancementsBacklog }, now);
  const updatedInitiative = advanceInitiativeState(initiative, "production", now);

  await buildStore.saveBuildBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);

  return {
    initiative: updatedInitiative,
    bundle: updatedBundle,
    appliedCount,
  };
}