export const READINESS_FIELDS = {
  problemStatement: "problem_statement",
  targetUser: "target_user",
  currentBehavior: "current_behavior",
  desiredBehavior: "desired_behavior",
  measurableOutcome: "measurable_outcome",
  acceptanceCriteria: "acceptance_criteria",
  affectedSystems: "affected_systems",
  dataClassification: "data_classification",
  dependencies: "dependencies",
  riskOwner: "risk_owner",
  decisionAuthority: "decision_authority",
  unresolvedQuestions: "unresolved_questions",
} as const;

export type ReadinessField = (typeof READINESS_FIELDS)[keyof typeof READINESS_FIELDS];

export interface UnresolvedQuestion {
  question: string;
  blocking: boolean;
}

export interface ReadinessEvaluationInput {
  problemStatement: string;
  targetUser: string;
  currentBehavior: string;
  desiredBehavior: string;
  measurableOutcome: string;
  dataClassification: string;
  constraints: string[];
  nonGoals: string[];
  affectedSystems: string[];
  dependencies: string[];
  ownerId: string;
  decisionAuthority: string;
  unresolvedQuestions: UnresolvedQuestion[];
  embeddedAcceptanceCriteriaCount: number;
  linkedAcceptanceCriteriaCount: number;
}

export interface ReadinessMissingField {
  field: ReadinessField;
  message: string;
}

export interface ReadinessEvaluationResult {
  ready: boolean;
  missingFields: ReadinessMissingField[];
}

function hasMinimumText(value: string, minimumLength: number): boolean {
  return value.trim().length >= minimumLength;
}

export function evaluateWorkItemReadiness(
  input: ReadinessEvaluationInput,
): ReadinessEvaluationResult {
  const missingFields: ReadinessMissingField[] = [];

  if (!hasMinimumText(input.problemStatement, 10)) {
    missingFields.push({
      field: READINESS_FIELDS.problemStatement,
      message: "Problem statement must describe the issue clearly",
    });
  }

  if (!hasMinimumText(input.targetUser, 2)) {
    missingFields.push({
      field: READINESS_FIELDS.targetUser,
      message: "Target user or stakeholder is required",
    });
  }

  if (!hasMinimumText(input.currentBehavior, 10)) {
    missingFields.push({
      field: READINESS_FIELDS.currentBehavior,
      message: "Current behavior must describe how the system works today",
    });
  }

  if (!hasMinimumText(input.desiredBehavior, 10)) {
    missingFields.push({
      field: READINESS_FIELDS.desiredBehavior,
      message: "Desired behavior must describe the expected outcome",
    });
  }

  if (!hasMinimumText(input.measurableOutcome, 10)) {
    missingFields.push({
      field: READINESS_FIELDS.measurableOutcome,
      message: "Measurable outcome is required",
    });
  }

  if (input.embeddedAcceptanceCriteriaCount + input.linkedAcceptanceCriteriaCount < 1) {
    missingFields.push({
      field: READINESS_FIELDS.acceptanceCriteria,
      message: "At least one acceptance criterion is required",
    });
  }

  if (input.affectedSystems.length === 0) {
    missingFields.push({
      field: READINESS_FIELDS.affectedSystems,
      message: "At least one affected system must be identified",
    });
  }

  if (!hasMinimumText(input.dataClassification, 2)) {
    missingFields.push({
      field: READINESS_FIELDS.dataClassification,
      message: "Data classification is required",
    });
  }

  if (!hasMinimumText(input.ownerId, 1)) {
    missingFields.push({
      field: READINESS_FIELDS.riskOwner,
      message: "Risk owner is required",
    });
  }

  if (!hasMinimumText(input.decisionAuthority, 2)) {
    missingFields.push({
      field: READINESS_FIELDS.decisionAuthority,
      message: "Decision authority is required",
    });
  }

  const blockingQuestions = input.unresolvedQuestions.filter(
    (entry) => entry.blocking && entry.question.trim().length > 0,
  );
  if (blockingQuestions.length > 0) {
    missingFields.push({
      field: READINESS_FIELDS.unresolvedQuestions,
      message: "Blocking unresolved questions must be answered before implementation",
    });
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
  };
}

export function buildReadinessEvaluationInput(input: {
  workItem: {
    problemStatement: string;
    targetUser: string;
    currentBehavior: string;
    desiredBehavior: string;
    measurableOutcome: string;
    dataClassification: string;
    constraints: string[];
    nonGoals: string[];
    affectedSystems: string[];
    dependencies: string[];
    ownerId: string;
    decisionAuthority: string;
    unresolvedQuestions: UnresolvedQuestion[];
    acceptanceCriteria: unknown[];
  };
  linkedAcceptanceCriteriaCount: number;
}): ReadinessEvaluationInput {
  return {
    problemStatement: input.workItem.problemStatement,
    targetUser: input.workItem.targetUser,
    currentBehavior: input.workItem.currentBehavior,
    desiredBehavior: input.workItem.desiredBehavior,
    measurableOutcome: input.workItem.measurableOutcome,
    dataClassification: input.workItem.dataClassification,
    constraints: input.workItem.constraints,
    nonGoals: input.workItem.nonGoals,
    affectedSystems: input.workItem.affectedSystems,
    dependencies: input.workItem.dependencies,
    ownerId: input.workItem.ownerId,
    decisionAuthority: input.workItem.decisionAuthority,
    unresolvedQuestions: input.workItem.unresolvedQuestions,
    embeddedAcceptanceCriteriaCount: input.workItem.acceptanceCriteria.length,
    linkedAcceptanceCriteriaCount: input.linkedAcceptanceCriteriaCount,
  };
}
