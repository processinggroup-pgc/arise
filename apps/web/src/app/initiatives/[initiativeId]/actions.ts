"use server";

import {
  alignProblemFramingForInitiative,
  runMarketResearchForInitiative,
} from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { revalidatePath } from "next/cache";

import { hasDatabaseUrl } from "@/lib/database";
import {
  getInitiativeStore,
  getMarketResearchStore,
  getProblemAlignmentStore,
  getProblemBriefStore,
} from "@/lib/product-discovery-stores";
import { runWithTenantScopedStores } from "@/lib/postgres-tenant";
import { getActiveWorkspaceForAction } from "@/lib/workspace";

export async function runMarketResearchAction(initiativeId: string): Promise<{ error?: string }> {
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) {
    return { error: "Choose an organization before continuing." };
  }

  try {
    const tenantContext = createTenantContext({
      organizationId: workspace.organizationId,
      userId: workspace.userId,
      correlationId: crypto.randomUUID(),
    });
    const operationContext = {
      createId: () => crypto.randomUUID(),
      now: () => new Date(),
    };

    if (hasDatabaseUrl()) {
      await runWithTenantScopedStores(tenantContext, async (stores) =>
        runMarketResearchForInitiative(
          { tenantContext, initiativeId },
          stores.initiativeStore,
          stores.problemBriefStore,
          stores.marketResearchStore,
          operationContext,
        ),
      );
    } else {
      await runMarketResearchForInitiative(
        { tenantContext, initiativeId },
        getInitiativeStore(),
        getProblemBriefStore(),
        getMarketResearchStore(),
        operationContext,
      );
    }

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
  const workspace = await getActiveWorkspaceForAction();
  if (workspace === null) {
    return { error: "Choose an organization before continuing." };
  }

  const selectedFramingId = String(formData.get("selectedFramingId") ?? "").trim();
  const userElaboration = String(formData.get("userElaboration") ?? "").trim();

  if (selectedFramingId.length === 0) {
    return { error: "Select a problem framing to continue" };
  }

  try {
    const tenantContext = createTenantContext({
      organizationId: workspace.organizationId,
      userId: workspace.userId,
      correlationId: crypto.randomUUID(),
    });
    const command = {
      tenantContext,
      initiativeId,
      selectedFramingId,
      ...(userElaboration.length > 0 ? { userElaboration } : {}),
    };
    const operationContext = {
      createId: () => crypto.randomUUID(),
      now: () => new Date(),
    };

    if (hasDatabaseUrl()) {
      await runWithTenantScopedStores(tenantContext, async (stores) =>
        alignProblemFramingForInitiative(
          command,
          stores.initiativeStore,
          stores.marketResearchStore,
          stores.problemAlignmentStore,
          operationContext,
        ),
      );
    } else {
      await alignProblemFramingForInitiative(
        command,
        getInitiativeStore(),
        getMarketResearchStore(),
        getProblemAlignmentStore(),
        operationContext,
      );
    }

    revalidatePath(`/initiatives/${initiativeId}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to align problem framing",
    };
  }
}
