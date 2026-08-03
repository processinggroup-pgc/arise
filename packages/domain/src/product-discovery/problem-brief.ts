export interface ProblemBrief {
  id: string;
  initiativeId: string;
  organizationId: string;
  rawProblemDescription: string;
  targetAudience: string;
  painPoints: string[];
  businessContext: string;
  desiredOutcome: string;
  createdAt: Date;
}

export interface CreateProblemBriefInput {
  initiativeId: string;
  organizationId: string;
  rawProblemDescription: string;
  targetAudience: string;
  painPoints?: string[];
  businessContext?: string;
  desiredOutcome: string;
}

export interface CreateProblemBriefMetadata {
  id: string;
  createdAt: Date;
}

function normalizeStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

export function createProblemBrief(
  input: CreateProblemBriefInput,
  metadata: CreateProblemBriefMetadata,
): ProblemBrief {
  const initiativeId = input.initiativeId.trim();
  const organizationId = input.organizationId.trim();
  const rawProblemDescription = input.rawProblemDescription.trim();
  const targetAudience = input.targetAudience.trim();
  const businessContext = input.businessContext?.trim() ?? "";
  const desiredOutcome = input.desiredOutcome.trim();
  const painPoints = normalizeStringList(input.painPoints);

  if (
    initiativeId.length === 0 ||
    organizationId.length === 0 ||
    rawProblemDescription.length === 0 ||
    targetAudience.length === 0 ||
    desiredOutcome.length === 0
  ) {
    throw new Error("Problem brief fields are required");
  }

  if (painPoints.length === 0) {
    throw new Error("At least one pain point is required");
  }

  return {
    id: metadata.id,
    initiativeId,
    organizationId,
    rawProblemDescription,
    targetAudience,
    painPoints,
    businessContext,
    desiredOutcome,
    createdAt: metadata.createdAt,
  };
}
