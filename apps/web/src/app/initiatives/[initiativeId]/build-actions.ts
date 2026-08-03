"use server";

import {
  applyEnhancementsForInitiative,
  beginPlatformSetupForInitiative,
  connectPlatformsForInitiative,
  detectPlatformEnvFromProcessEnv,
  runUatForInitiative,
  startMvpBuildForInitiative,
  type ManualPlatformInput,
} from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { revalidatePath } from "next/cache";

import { hasDatabaseUrl } from "@/lib/database";
import {
  getBuildStore,
  getCohortDiscoveryStore,
  getInitiativeStore,
  getTechnicalDesignStore,
} from "@/lib/product-discovery-stores";
import { runWithTenantScopedStores, type TenantScopedStores } from "@/lib/postgres-tenant";
import { getProjectStore, getWorkItemStore } from "@/lib/stores";
import { getActiveWorkspaceForAction } from "@/lib/workspace";
import { getVercelProjectPort, usesLiveVercelApi } from "@/lib/vercel-integration";

type Step5Stores = Pick<
  TenantScopedStores,
  | "initiativeStore"
  | "cohortDiscoveryStore"
  | "technicalDesignStore"
  | "buildStore"
  | "projectStore"
  | "workItemStore"
>;

function operationContext() {
  return { createId: () => crypto.randomUUID(), now: () => new Date() };
}

function createCommand(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceForAction>>>,
  initiativeId: string,
) {
  return {
    tenantContext: createTenantContext({
      organizationId: workspace.organizationId,
      userId: workspace.userId,
      correlationId: crypto.randomUUID(),
    }),
    initiativeId,
  };
}

async function withStep5Stores<T>(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceForAction>>>,
  operation: (stores: Step5Stores) => Promise<T>,
): Promise<T> {
  const tenantContext = createTenantContext({
    organizationId: workspace.organizationId,
    userId: workspace.userId,
    correlationId: crypto.randomUUID(),
  });

  if (hasDatabaseUrl()) {
    return runWithTenantScopedStores(tenantContext, async (stores) => operation(stores));
  }

  return operation({
    initiativeStore: getInitiativeStore(),
    cohortDiscoveryStore: getCohortDiscoveryStore(),
    technicalDesignStore: getTechnicalDesignStore(),
    buildStore: getBuildStore(),
    projectStore: getProjectStore(),
    workItemStore: getWorkItemStore(),
  });
}

async function runStep5Action(
  initiativeId: string,
  operation: (command: ReturnType<typeof createCommand>, stores: Step5Stores) => Promise<unknown>,
): Promise<{ error?: string }> {
  try {
    const workspace = await getActiveWorkspaceForAction();
    if (workspace === null) {
      return { error: "No active workspace" };
    }

    const command = createCommand(workspace, initiativeId);
    await withStep5Stores(workspace, (stores) => operation(command, stores));
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Step 5 action failed" };
  }
}

export async function detectPlatformsAction(): Promise<{
  detected?: ReturnType<typeof detectPlatformEnvFromProcessEnv>;
  error?: string;
}> {
  try {
    return { detected: detectPlatformEnvFromProcessEnv() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Detection failed" };
  }
}

export async function beginPlatformSetupAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep5Action(initiativeId, (command, stores) =>
    beginPlatformSetupForInitiative(
      command,
      stores.initiativeStore,
      stores.buildStore,
      operationContext(),
    ),
  );
}

export async function connectPlatformsVercelManagedAction(
  initiativeId: string,
): Promise<{ error?: string }> {
  return runStep5Action(initiativeId, (command, stores) =>
    connectPlatformsForInitiative(
      command,
      stores.initiativeStore,
      stores.buildStore,
      operationContext(),
      { mode: "vercel_managed" },
      getVercelProjectPort(),
    ),
  );
}

export async function connectPlatformsFromEnvAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep5Action(initiativeId, (command, stores) =>
    connectPlatformsForInitiative(
      command,
      stores.initiativeStore,
      stores.buildStore,
      operationContext(),
      { mode: "env" },
      getVercelProjectPort(),
    ),
  );
}

export async function connectPlatformsManualAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const manual: ManualPlatformInput = {
    supabaseProjectRef: String(formData.get("supabaseProjectRef") ?? ""),
    supabaseDatabaseUrlRef: String(formData.get("supabaseDatabaseUrlRef") ?? ""),
    supabaseAnonKeyRef: String(formData.get("supabaseAnonKeyRef") ?? ""),
    vercelProjectId: String(formData.get("vercelProjectId") ?? ""),
    vercelTeamId: String(formData.get("vercelTeamId") ?? ""),
    vercelTokenRef: String(formData.get("vercelTokenRef") ?? ""),
    resendApiKeyRef: String(formData.get("resendApiKeyRef") ?? ""),
    resendFromEmail: String(formData.get("resendFromEmail") ?? ""),
  };

  return runStep5Action(initiativeId, (command, stores) =>
    connectPlatformsForInitiative(
      command,
      stores.initiativeStore,
      stores.buildStore,
      operationContext(),
      { mode: "manual", manual },
    ),
  );
}

export async function startMvpBuildAction(initiativeId: string): Promise<{ error?: string }> {
  if (!usesLiveVercelApi()) {
    return { error: "VERCEL_TOKEN is required to provision projects via the Vercel API" };
  }

  return runStep5Action(initiativeId, (command, stores) =>
    startMvpBuildForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.technicalDesignStore,
      stores.buildStore,
      stores.projectStore,
      stores.workItemStore,
      operationContext(),
      getVercelProjectPort(),
    ),
  );
}

export async function runUatAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep5Action(initiativeId, (command, stores) =>
    runUatForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.buildStore,
      operationContext(),
    ),
  );
}

export async function applyEnhancementsAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const selected = formData.getAll("enhancementId").map(String);

  return runStep5Action(initiativeId, (command, stores) =>
    applyEnhancementsForInitiative(
      command,
      stores.initiativeStore,
      stores.buildStore,
      operationContext(),
      selected,
    ),
  );
}
