export interface RequirementAcceptanceCriterion {
  id: string;
  requirementId: string;
  organizationId: string;
  given: string;
  when: string;
  then: string;
  automatedTestRef: string;
  createdAt: Date;
}

export interface CreateRequirementAcceptanceCriterionInput {
  requirementId: string;
  organizationId: string;
  given: string;
  when: string;
  then: string;
  automatedTestRef: string;
}

export interface CreateRequirementAcceptanceCriterionMetadata {
  id: string;
  createdAt: Date;
}

const AUTOMATED_TEST_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u;

function assertAutomatedTestRef(automatedTestRef: string): string {
  const normalized = automatedTestRef.trim();

  if (normalized.length < 3) {
    throw new Error("Automated test reference is required");
  }

  if (!AUTOMATED_TEST_REF_PATTERN.test(normalized)) {
    throw new Error("Automated test reference is invalid");
  }

  return normalized;
}

function assertGwtField(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

export function createRequirementAcceptanceCriterion(
  input: CreateRequirementAcceptanceCriterionInput,
  metadata: CreateRequirementAcceptanceCriterionMetadata,
): RequirementAcceptanceCriterion {
  const requirementId = input.requirementId.trim();
  const organizationId = input.organizationId.trim();

  if (requirementId.length === 0) {
    throw new Error("Requirement identifier is required");
  }

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  return {
    id: metadata.id,
    requirementId,
    organizationId,
    given: assertGwtField(input.given, "Given clause"),
    when: assertGwtField(input.when, "When clause"),
    then: assertGwtField(input.then, "Then clause"),
    automatedTestRef: assertAutomatedTestRef(input.automatedTestRef),
    createdAt: metadata.createdAt,
  };
}

export function buildAutomatedTestRef(input: {
  workItemLineageId: string;
  requirementSequence: number;
  criterionSequence: number;
}): string {
  const lineageToken = input.workItemLineageId.replace(/[^A-Za-z0-9]/gu, "").slice(0, 8);

  return `WI-${lineageToken}-REQ-${String(input.requirementSequence)}-AC-${String(input.criterionSequence)}`;
}
