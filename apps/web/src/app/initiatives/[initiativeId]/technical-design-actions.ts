"use server";

import {
  approveTechnicalDesignForInitiative,
  generateArchitectureForInitiative,
  generateDataModelForInitiative,
  generateGapAnalysisForInitiative,
  generateTechStackForInitiative,
} from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { revalidatePath } from "next/cache";

import { getTechnicalDesignGenerator } from "@/lib/technical-design-generator";
import { hasDatabaseUrl } from "@/lib/database";
import {
  getCohortDiscoveryStore,
  getInitiativeStore,
  getTechnicalDesignStore,
} from "@/lib/product-discovery-stores";
import { runWithTenantScopedStores, type TenantScopedStores } from "@/lib/postgres-tenant";
import { getActiveWorkspaceForAction } from "@/lib/workspace";

type Step4Stores = Pick<
  TenantScopedStores,
  "initiativeStore" | "cohortDiscoveryStore" | "technicalDesignStore"
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

async function withStep4Stores<T>(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceForAction>>>,
  operation: (stores: Step4Stores) => Promise<T>,
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
  });
}

export async function generateArchitectureAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep4Action(initiativeId, (command, stores) =>
    generateArchitectureForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.technicalDesignStore,
      operationContext(),
      getTechnicalDesignGenerator(),
    ),
  );
}

export async function generateTechStackAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep4Action(initiativeId, (command, stores) =>
    generateTechStackForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.technicalDesignStore,
      operationContext(),
      getTechnicalDesignGenerator(),
    ),
  );
}

export async function generateDataModelAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep4Action(initiativeId, (command, stores) =>
    generateDataModelForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.technicalDesignStore,
      operationContext(),
      getTechnicalDesignGenerator(),
    ),
  );
}

export async function generateGapAnalysisAction(initiativeId: string): Promise<{ error?: string }> {
  return runStep4Action(initiativeId, (command, stores) =>
    generateGapAnalysisForInitiative(
      command,
      stores.initiativeStore,
      stores.cohortDiscoveryStore,
      stores.technicalDesignStore,
      operationContext(),
      getTechnicalDesignGenerator(),
    ),
  );
}

export async function approveTechnicalDesignAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  const sessionNotesStep4 = String(formData.get("sessionNotesStep4") ?? "").trim();

  try {
    await withStep4Stores(workspace, (stores) =>
      approveTechnicalDesignForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        stores.technicalDesignStore,
        operationContext(),
        getTechnicalDesignGenerator(),
        sessionNotesStep4.length > 0 ? sessionNotesStep4 : undefined,
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to approve technical design",
    };
  }
}

async function runStep4Action(
  initiativeId: string,
  step: (
    command: ReturnType<typeof createCommand>,
    stores: Step4Stores,
  ) => Promise<unknown>,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withStep4Stores(workspace, (stores) =>
      step(createCommand(workspace, initiativeId), stores),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to complete step 4 action" };
  }
}
