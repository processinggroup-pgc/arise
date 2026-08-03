"use server";

import {
  alignProblemFramingForInitiative,
  runMarketResearchForInitiative,
} from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { revalidatePath } from "next/cache";

import {
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
} from "@/lib/product-discovery-stores";
import { getWorkspaceSession } from "@/lib/session";

export async function runMarketResearchAction(initiativeId: string): Promise<{ error?: string }> {
  const session = await getWorkspaceSession();
  if (session.organizationId === undefined) {
    return { error: "Organization session is required" };
  }

  try {
    const tenantContext = createTenantContext({
      organizationId: session.organizationId,
      userId: session.userId,
      correlationId: crypto.randomUUID(),
    });

    await runMarketResearchForInitiative(
      { tenantContext, initiativeId },
      getInitiativeStore(),
      getProblemBriefStore(),
      getMarketResearchStore(),
      {
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
      },
    );

    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to run market research",
    };
  }
}

export async function alignProblemFramingAction(
  initiativeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await getWorkspaceSession();
  if (session.organizationId === undefined) {
    return { error: "Organization session is required" };
  }

  const selectedFramingId = String(formData.get("selectedFramingId") ?? "").trim();
  const userElaboration = String(formData.get("userElaboration") ?? "").trim();

  if (selectedFramingId.length === 0) {
    return { error: "Select a problem framing to continue" };
  }

  try {
    const tenantContext = createTenantContext({
      organizationId: session.organizationId,
      userId: session.userId,
      correlationId: crypto.randomUUID(),
    });

    await alignProblemFramingForInitiative(
      {
        tenantContext,
        initiativeId,
        selectedFramingId,
        ...(userElaboration.length > 0 ? { userElaboration } : {}),
      },
      getInitiativeStore(),
      getMarketResearchStore(),
      getProblemAlignmentStore(),
      {
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
      },
    );

    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to align problem framing",
    };
  }
}
