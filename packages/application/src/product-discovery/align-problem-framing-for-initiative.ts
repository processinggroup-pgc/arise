import {
  advanceInitiativeState,
  createProblemAlignment,
  findFramingOption,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { InitiativeScopeError } from "./create-initiative-with-problem.js";
import type {
  InitiativeStore,
  MarketResearchStore,
  ProblemAlignmentStore,
} from "./product-discovery-store.js";
import { InitiativeWorkflowError } from "./run-market-research-for-initiative.js";

export interface AlignProblemFramingCommand {
  tenantContext: TenantContext;
  initiativeId: string;
  selectedFramingId: string;
  userElaboration?: string;
}

export async function alignProblemFramingForInitiative(
  command: AlignProblemFramingCommand,
  initiativeStore: InitiativeStore,
  marketResearchStore: MarketResearchStore,
  problemAlignmentStore: ProblemAlignmentStore,
  operationContext: IdentityOperationContext,
): Promise<{
  initiative: NonNullable<Awaited<ReturnType<InitiativeStore["findInitiativeById"]>>>;
  alignment: ReturnType<typeof createProblemAlignment>;
}> {
  const initiative = await initiativeStore.findInitiativeById(command.initiativeId);
  if (initiative === undefined) {
    throw new InitiativeWorkflowError("Initiative was not found");
  }

  if (initiative.organizationId !== command.tenantContext.organizationId) {
    throw new InitiativeScopeError("Initiative is outside the tenant scope");
  }

  if (initiative.state !== "research_complete") {
    throw new InitiativeWorkflowError("Problem alignment requires completed market research");
  }

  const dossier = await marketResearchStore.findMarketResearchByInitiativeId(command.initiativeId);
  if (dossier === undefined) {
    throw new InitiativeWorkflowError("Market research dossier was not found");
  }

  const selectedFraming = findFramingOption(dossier, command.selectedFramingId);
  if (selectedFraming === undefined) {
    throw new InitiativeWorkflowError("Selected problem framing was not found");
  }

  const alignment = createProblemAlignment(
    {
      initiativeId: initiative.id,
      organizationId: initiative.organizationId,
      selectedFramingId: selectedFraming.id,
      ...(command.userElaboration !== undefined ? { userElaboration: command.userElaboration } : {}),
    },
    {
      id: operationContext.createId(),
      alignedAt: operationContext.now(),
    },
  );

  const updatedInitiative = advanceInitiativeState(
    initiative,
    "problem_aligned",
    operationContext.now(),
  );

  await problemAlignmentStore.saveProblemAlignment(alignment);
  await initiativeStore.saveInitiative(updatedInitiative);

  return {
    initiative: updatedInitiative,
    alignment,
  };
}
