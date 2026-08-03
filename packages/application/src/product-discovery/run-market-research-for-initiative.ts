import {
  advanceInitiativeState,
  generateMarketResearchDossier,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { InitiativeScopeError } from "./create-initiative-with-problem.js";
import type {
  InitiativeStore,
  MarketResearchStore,
  ProblemBriefStore,
} from "./product-discovery-store.js";

export interface RunMarketResearchCommand {
  tenantContext: TenantContext;
  initiativeId: string;
}

export class InitiativeWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitiativeWorkflowError";
  }
}

export async function runMarketResearchForInitiative(
  command: RunMarketResearchCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  marketResearchStore: MarketResearchStore,
  operationContext: IdentityOperationContext,
): Promise<{
  initiative: NonNullable<Awaited<ReturnType<InitiativeStore["findInitiativeById"]>>>;
  dossier: ReturnType<typeof generateMarketResearchDossier>;
}> {
  const initiative = await initiativeStore.findInitiativeById(command.initiativeId);
  if (initiative === undefined) {
    throw new InitiativeWorkflowError("Initiative was not found");
  }

  if (initiative.organizationId !== command.tenantContext.organizationId) {
    throw new InitiativeScopeError("Initiative is outside the tenant scope");
  }

  if (initiative.state !== "problem_captured") {
    throw new InitiativeWorkflowError("Market research requires a captured problem brief");
  }

  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  if (problemBrief === undefined) {
    throw new InitiativeWorkflowError("Problem brief was not found");
  }

  const dossier = generateMarketResearchDossier(
    {
      initiativeId: initiative.id,
      organizationId: initiative.organizationId,
      rawProblemDescription: problemBrief.rawProblemDescription,
      targetAudience: problemBrief.targetAudience,
      painPoints: problemBrief.painPoints,
      businessContext: problemBrief.businessContext,
      desiredOutcome: problemBrief.desiredOutcome,
    },
    {
      id: operationContext.createId(),
      generatedAt: operationContext.now(),
      createFramingId: (index) => operationContext.createId() + `_framing_${String(index + 1)}`,
    },
  );

  const updatedInitiative = advanceInitiativeState(
    initiative,
    "research_complete",
    operationContext.now(),
  );

  await marketResearchStore.saveMarketResearchDossier(dossier);
  await initiativeStore.saveInitiative(updatedInitiative);

  return {
    initiative: updatedInitiative,
    dossier,
  };
}
