"use server";

import { createInitiativeWithProblem } from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { redirect } from "next/navigation";

import { COHORT_AFFORDABILITY_DEFAULTS } from "@/lib/initiative-defaults";
import {
  getInitiativeStore,
  getProblemBriefStore,
} from "@/lib/product-discovery-stores";
import { getWorkspaceSession } from "@/lib/session";

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
  const session = await getWorkspaceSession();
  if (session.organizationId === undefined) {
    return { error: "Create an organization before starting an initiative." };
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

  let initiativeId: string;
  try {
    const tenantContext = createTenantContext({
      organizationId: session.organizationId,
      userId: session.userId,
      correlationId: crypto.randomUUID(),
    });

    const result = await createInitiativeWithProblem(
      {
        tenantContext,
        title,
        rawProblemDescription,
        targetAudience,
        painPoints,
        businessContext,
        desiredOutcome,
      },
      getInitiativeStore(),
      getProblemBriefStore(),
      {
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
      },
    );

    initiativeId = result.initiative.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create initiative",
    };
  }

  redirect(`/initiatives/${initiativeId}`);
}
