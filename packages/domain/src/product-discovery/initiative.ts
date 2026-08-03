export const INITIATIVE_STATES = [
  "draft",
  "problem_captured",
  "research_complete",
  "problem_aligned",
  "business_case_complete",
  "solution_selected",
  "mvp_finalized",
  "persona_complete",
  "userflow_complete",
  "storymap_complete",
  "brd_draft",
  "design_approved",
  "building",
  "uat",
  "production",
  "ops_handoff",
] as const;

export type InitiativeState = (typeof INITIATIVE_STATES)[number];

export interface Initiative {
  id: string;
  organizationId: string;
  title: string;
  state: InitiativeState;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInitiativeInput {
  organizationId: string;
  title: string;
  ownerId: string;
  state?: string;
}

export interface CreateInitiativeMetadata {
  id: string;
  createdAt: Date;
}

function assertInitiativeState(state: string): InitiativeState {
  if (!(INITIATIVE_STATES as readonly string[]).includes(state)) {
    throw new Error("Initiative state is invalid");
  }

  return state as InitiativeState;
}

export function createInitiative(
  input: CreateInitiativeInput,
  metadata: CreateInitiativeMetadata,
): Initiative {
  const organizationId = input.organizationId.trim();
  const title = input.title.trim();
  const ownerId = input.ownerId.trim();

  if (organizationId.length === 0 || title.length === 0 || ownerId.length === 0) {
    throw new Error("Initiative identifiers and title are required");
  }

  return {
    id: metadata.id,
    organizationId,
    title,
    state: assertInitiativeState(input.state ?? "draft"),
    ownerId,
    createdAt: metadata.createdAt,
    updatedAt: metadata.createdAt,
  };
}

export function advanceInitiativeState(
  initiative: Initiative,
  nextState: InitiativeState,
  updatedAt: Date,
): Initiative {
  if (initiative.state === nextState) {
    return initiative;
  }

  return {
    ...initiative,
    state: nextState,
    updatedAt,
  };
}
