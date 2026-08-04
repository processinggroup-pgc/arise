"use server";

import {
  approveDesignForInitiative,
  assembleBrdForInitiative,
  finalizeConceptForInitiative,
  finalizeMvpForInitiative,
  generateBusinessCaseForInitiative,
  generateMvpScopeForInitiative,
  generatePersonaForInitiative,
  generateStoryMapForInitiative,
  generateUserFlowForInitiative,
  runStressTestForInitiative,
  saveDualAiComparisonForInitiative,
  saveSessionNotesForInitiative,
} from "@arise/application";
import { createTenantContext, type TenantContext } from "@arise/domain";
import { revalidatePath } from "next/cache";

import { getCohortGenerator } from "@/lib/cohort-generator";
import { generateDualAiSecondary } from "@/lib/dual-ai-generator";
import { hasDatabaseUrl } from "@/lib/database";
import {
  getCohortDiscoveryStore,
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
} from "@/lib/product-discovery-stores";
import { runWithTenantScopedStores, type TenantScopedStores } from "@/lib/postgres-tenant";
import { getActiveWorkspaceForAction } from "@/lib/workspace";

type CohortStores = Pick<
  TenantScopedStores,
  | "initiativeStore"
  | "problemBriefStore"
  | "marketResearchStore"
  | "problemAlignmentStore"
  | "cohortDiscoveryStore"
>;

function operationContext() {
  return { createId: () => crypto.randomUUID(), now: () => new Date() };
}

function createCommand(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceForAction>>>,
  initiativeId: string,
): { tenantContext: TenantContext; initiativeId: string } {
  return {
    tenantContext: createTenantContext({
      organizationId: workspace.organizationId,
      userId: workspace.userId,
      correlationId: crypto.randomUUID(),
    }),
    initiativeId,
  };
}

async function withCohortStores<T>(
  workspace: NonNullable<Awaited<ReturnType<typeof getActiveWorkspaceForAction>>>,
  operation: (stores: CohortStores) => Promise<T>,
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
    problemBriefStore: getProblemBriefStore(),
    marketResearchStore: getMarketResearchStore(),
    problemAlignmentStore: getProblemAlignmentStore(),
    cohortDiscoveryStore: getCohortDiscoveryStore(),
  });
}

export async function saveDualAiComparisonAction(
  initiativeId: string,
): Promise<{ error?: string; warning?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    const result = await withCohortStores(workspace, (stores) =>
      saveDualAiComparisonForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.problemBriefStore,
        stores.marketResearchStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        generateDualAiSecondary,
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return result.warning !== undefined ? { warning: result.warning } : {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save dual-AI comparison" };
  }
}

export async function runStressTestAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      runStressTestForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.problemBriefStore,
        stores.marketResearchStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to run stress test" };
  }
}

export async function finalizeConceptAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  const selectedFramingId = String(formData.get("selectedFramingId") ?? "").trim();
  const userElaboration = String(formData.get("userElaboration") ?? "").trim();
  const problem = String(formData.get("problem") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const solution = String(formData.get("solution") ?? "").trim();
  const whyNow = String(formData.get("whyNow") ?? "").trim();
  const topRisks = String(formData.get("topRisks") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const sessionNotesWeek1 = String(formData.get("sessionNotesWeek1") ?? "").trim();

  if (selectedFramingId.length === 0 || problem.length === 0 || customer.length === 0) {
    return { error: "Select a framing and complete the business concept fields" };
  }

  try {
    await withCohortStores(workspace, (stores) =>
      finalizeConceptForInitiative(
        {
          ...createCommand(workspace, initiativeId),
          selectedFramingId,
          ...(userElaboration.length > 0 ? { userElaboration } : {}),
          businessConcept: { problem, customer, solution, whyNow, topRisks: topRisks.slice(0, 3) },
          ...(sessionNotesWeek1.length > 0 ? { sessionNotesWeek1 } : {}),
        },
        stores.initiativeStore,
        stores.marketResearchStore,
        stores.problemAlignmentStore,
        stores.cohortDiscoveryStore,
        operationContext(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to finalize concept" };
  }
}

export async function generateBusinessCaseAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      generateBusinessCaseForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.problemBriefStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate business case" };
  }
}

export async function generateMvpScopeAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  const featureWishList = ["feature1", "feature2", "feature3", "feature4", "feature5"]
    .map((key) => String(formData.get(key) ?? "").trim())
    .filter((value) => value.length > 0);
  const sessionNotesWeek2 = String(formData.get("sessionNotesWeek2") ?? "").trim();

  if (featureWishList.length < 3) {
    return { error: "Enter at least 3 feature wish-list items" };
  }

  try {
    await withCohortStores(workspace, (stores) =>
      generateMvpScopeForInitiative(
        {
          ...createCommand(workspace, initiativeId),
          featureWishList,
          ...(sessionNotesWeek2.length > 0 ? { sessionNotesWeek2 } : {}),
        },
        stores.initiativeStore,
        stores.problemBriefStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate MVP scope" };
  }
}

export async function finalizeMvpAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  const chosenModel = String(formData.get("chosenModel") ?? "").trim();
  const pricingStartingPoint = String(formData.get("pricingStartingPoint") ?? "").trim();
  const killerAssumption = String(formData.get("killerAssumption") ?? "").trim();

  if (chosenModel.length === 0 || pricingStartingPoint.length === 0) {
    return { error: "Revenue model and pricing are required" };
  }

  try {
    await withCohortStores(workspace, (stores) =>
      finalizeMvpForInitiative(
        {
          ...createCommand(workspace, initiativeId),
          chosenModel,
          pricingStartingPoint,
          killerAssumption,
        },
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to finalize MVP" };
  }
}

export async function generatePersonaAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      generatePersonaForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.problemBriefStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate persona" };
  }
}

export async function generateUserFlowAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      generateUserFlowForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate user flow" };
  }
}

export async function generateStoryMapAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      generateStoryMapForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate story map" };
  }
}

export async function assembleBrdAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      assembleBrdForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        getCohortGenerator(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to assemble BRD" };
  }
}

export async function approveDesignAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  const sessionNotesWeek3 = String(formData.get("sessionNotesWeek3") ?? "").trim();

  try {
    await withCohortStores(workspace, (stores) =>
      approveDesignForInitiative(
        createCommand(workspace, initiativeId),
        stores.initiativeStore,
        stores.cohortDiscoveryStore,
        operationContext(),
        sessionNotesWeek3.length > 0 ? sessionNotesWeek3 : undefined,
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to approve design" };
  }
}

export async function saveSessionNotesAction(
  initiativeId: string,
  week: 1 | 2 | 3,
  notes: string,
): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) return { error: "Choose an organization before continuing." };

  try {
    await withCohortStores(workspace, (stores) =>
      saveSessionNotesForInitiative(
        { ...createCommand(workspace, initiativeId), week, notes },
        stores.cohortDiscoveryStore,
        stores.initiativeStore,
        operationContext(),
      ),
    );
    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save session notes" };
  }
}
