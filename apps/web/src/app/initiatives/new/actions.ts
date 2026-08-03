"use server";

import { createInitiativeWithProblem } from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { redirect } from "next/navigation";

import { COHORT_AFFORDABILITY_DEFAULTS } from "@/lib/initiative-defaults";
import { hasDatabaseUrl } from "@/lib/database";
import { getInitiativeStore, getProblemBriefStore } from "@/lib/product-discovery-stores";
import { createWorkspaceTenantContext, runWithTenantScopedStores } from "@/lib/postgres-tenant";
import { getActiveWorkspaceForAction } from "@/lib/workspace";

export interface CreateInitiativeFormState {
  error?: string;
}

function parsePainPoints(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function createInitiativeAction(
  _previousState: CreateInitiativeFormState,
  formData: FormData,
): Promise<CreateInitiativeFormState> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) {
    return { error: "Choose an organization before starting an initiative." };
  }

  const title = String(formData.get("title") ?? COHORT_AFFORDABILITY_DEFAULTS.title).trim();
  const rawProblemDescription = String(
    formData.get("rawProblemDescription") ?? COHORT_AFFORDABILITY_DEFAULTS.rawProblemDescription,
  ).trim();
  const targetAudience = String(
    formData.get("targetAudience") ?? COHORT_AFFORDABILITY_DEFAULTS.targetAudience,
  ).trim();
  const painPoints = parsePainPoints(
    String(formData.get("painPoints") ?? COHORT_AFFORDABILITY_DEFAULTS.painPoints),
  );
  const businessContext = String(
    formData.get("businessContext") ?? COHORT_AFFORDABILITY_DEFAULTS.businessContext,
  ).trim();
  const desiredOutcome = String(
    formData.get("desiredOutcome") ?? COHORT_AFFORDABILITY_DEFAULTS.desiredOutcome,
  ).trim();
  const icpRole = String(formData.get("icpRole") ?? "").trim();
  const icpIncomeLevel = String(formData.get("icpIncomeLevel") ?? "").trim();
  const icpDailyWorkflow = String(formData.get("icpDailyWorkflow") ?? "").trim();
  const icpToolsUsed = parsePainPoints(String(formData.get("icpToolsUsed") ?? ""));
  const icpOnlineHangouts = parsePainPoints(String(formData.get("icpOnlineHangouts") ?? ""));
  const icpBudgetRange = String(formData.get("icpBudgetRange") ?? "").trim();

  let initiativeId: string;
  try {
    const tenantContext = createTenantContext({
      organizationId: workspace.organizationId,
      userId: workspace.userId,
      correlationId: crypto.randomUUID(),
    });
    const command = {
      tenantContext,
      title,
      rawProblemDescription,
      targetAudience,
      painPoints,
      businessContext,
      desiredOutcome,
      ...(icpRole.length > 0 ? { icpRole } : {}),
      ...(icpIncomeLevel.length > 0 ? { icpIncomeLevel } : {}),
      ...(icpDailyWorkflow.length > 0 ? { icpDailyWorkflow } : {}),
      ...(icpToolsUsed.length > 0 ? { icpToolsUsed } : {}),
      ...(icpOnlineHangouts.length > 0 ? { icpOnlineHangouts } : {}),
      ...(icpBudgetRange.length > 0 ? { icpBudgetRange } : {}),
    };
    const operationContext = {
      createId: () => crypto.randomUUID(),
      now: () => new Date(),
    };

    const result = hasDatabaseUrl()
      ? await runWithTenantScopedStores(tenantContext, async (stores) =>
          createInitiativeWithProblem(
            command,
            stores.initiativeStore,
            stores.problemBriefStore,
            operationContext,
          ),
        )
      : await createInitiativeWithProblem(
          command,
          getInitiativeStore(),
          getProblemBriefStore(),
          operationContext,
        );

    initiativeId = result.initiative.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create initiative",
    };
  }

  redirect(`/initiatives/${initiativeId}`);
}
