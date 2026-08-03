import { describe, expect, it } from "vitest";

import {
  buildReadinessEvaluationInput,
  evaluateWorkItemReadiness,
  READINESS_FIELDS,
} from "./readiness-evaluation.js";

const readyInput = {
  problemStatement: "Operators cannot inspect memberships safely across tenants.",
  targetUser: "Platform operator",
  currentBehavior: "Membership lists can be requested without tenant validation.",
  desiredBehavior: "Membership lists are scoped to the active organization only.",
  measurableOutcome: "Cross-tenant membership reads return zero rows in security tests.",
  dataClassification: "internal",
  constraints: ["Must preserve existing API headers"],
  nonGoals: ["Changing authentication provider"],
  affectedSystems: ["memberships API"],
  dependencies: ["tenant context middleware"],
  ownerId: "user_owner",
  decisionAuthority: "Processing group owner",
  unresolvedQuestions: [{ question: "Need audit export format?", blocking: false }],
  embeddedAcceptanceCriteriaCount: 1,
  linkedAcceptanceCriteriaCount: 0,
};

describe("evaluateWorkItemReadiness", () => {
  it("reports ready when all required readiness fields are present", () => {
    const result = evaluateWorkItemReadiness(readyInput);

    expect(result.ready).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it("reports missing target user with an actionable field reference", () => {
    const result = evaluateWorkItemReadiness({
      ...readyInput,
      targetUser: " ",
    });

    expect(result.ready).toBe(false);
    expect(result.missingFields).toContainEqual({
      field: READINESS_FIELDS.targetUser,
      message: "Target user or stakeholder is required",
    });
  });

  it("blocks readiness when blocking unresolved questions remain", () => {
    const result = evaluateWorkItemReadiness({
      ...readyInput,
      unresolvedQuestions: [{ question: "Who approves production access?", blocking: true }],
    });

    expect(result.ready).toBe(false);
    expect(result.missingFields).toContainEqual({
      field: READINESS_FIELDS.unresolvedQuestions,
      message: "Blocking unresolved questions must be answered before implementation",
    });
  });

  it("accepts linked requirement acceptance criteria", () => {
    const result = evaluateWorkItemReadiness({
      ...readyInput,
      embeddedAcceptanceCriteriaCount: 0,
      linkedAcceptanceCriteriaCount: 1,
    });

    expect(result.ready).toBe(true);
  });
});

describe("buildReadinessEvaluationInput", () => {
  it("maps work item intent fields into a readiness evaluation input", () => {
    const input = buildReadinessEvaluationInput({
      workItem: {
        problemStatement: readyInput.problemStatement,
        targetUser: readyInput.targetUser,
        currentBehavior: readyInput.currentBehavior,
        desiredBehavior: readyInput.desiredBehavior,
        measurableOutcome: readyInput.measurableOutcome,
        dataClassification: readyInput.dataClassification,
        constraints: readyInput.constraints,
        nonGoals: readyInput.nonGoals,
        affectedSystems: readyInput.affectedSystems,
        dependencies: readyInput.dependencies,
        ownerId: readyInput.ownerId,
        decisionAuthority: readyInput.decisionAuthority,
        unresolvedQuestions: readyInput.unresolvedQuestions,
        acceptanceCriteria: [{}],
      },
      linkedAcceptanceCriteriaCount: 2,
    });

    expect(input.linkedAcceptanceCriteriaCount).toBe(2);
    expect(input.embeddedAcceptanceCriteriaCount).toBe(1);
  });
});
