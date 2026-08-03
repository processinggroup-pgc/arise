import {
  advanceInitiativeState,
  createInitiative,
  createProblemBrief,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { InitiativeStore, ProblemBriefStore } from "./product-discovery-store.js";

export interface CreateInitiativeWithProblemCommand {
  tenantContext: TenantContext;
  title: string;
  rawProblemDescription: string;
  targetAudience: string;
  painPoints: string[];
  businessContext?: string;
  desiredOutcome: string;
}

export class InitiativeScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitiativeScopeError";
  }
}

export async function createInitiativeWithProblem(
  command: CreateInitiativeWithProblemCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  operationContext: IdentityOperationContext,
): Promise<{
  initiative: Awaited<ReturnType<typeof createInitiative>>;
  problemBrief: ReturnType<typeof createProblemBrief>;
}> {
  const createdAt = operationContext.now();
  const initiative = advanceInitiativeState(
    createInitiative(
      {
        organizationId: command.tenantContext.organizationId,
        title: command.title,
        ownerId: command.tenantContext.userId,
        state: "problem_captured",
      },
      {
        id: operationContext.createId(),
        createdAt,
      },
    ),
    "problem_captured",
    createdAt,
  );

  if (initiative.organizationId !== command.tenantContext.organizationId) {
    throw new InitiativeScopeError("Initiative is outside the tenant scope");
  }

  const problemBrief = createProblemBrief(
    {
      initiativeId: initiative.id,
      organizationId: command.tenantContext.organizationId,
      rawProblemDescription: command.rawProblemDescription,
      targetAudience: command.targetAudience,
      painPoints: command.painPoints,
      ...(command.businessContext !== undefined ? { businessContext: command.businessContext } : {}),
      desiredOutcome: command.desiredOutcome,
    },
    {
      id: operationContext.createId(),
      createdAt,
    },
  );

  await initiativeStore.saveInitiative(initiative);
  await problemBriefStore.saveProblemBrief(problemBrief);

  return {
    initiative,
    problemBrief,
  };
}
