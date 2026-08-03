export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

import type { UnresolvedQuestion } from "./readiness-evaluation.js";
export type { UnresolvedQuestion } from "./readiness-evaluation.js";

export const DATA_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "personal",
  "financial",
  "health",
  "authentication",
  "trade_secret",
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export { WORK_ITEM_STATES, type WorkItemState } from "./work-item-state-machine.js";
import { WORK_ITEM_STATES, type WorkItemState } from "./work-item-state-machine.js";

export const WORK_ITEM_TYPES = ["feature", "bug", "improvement", "spike"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type WorkItemRiskLevel = (typeof WORK_ITEM_RISK_LEVELS)[number];

export interface WorkItem {
  id: string;
  lineageId: string;
  version: number;
  projectId: string;
  organizationId: string;
  title: string;
  type: WorkItemType;
  state: WorkItemState;
  riskLevel: WorkItemRiskLevel;
  ownerId: string;
  problemStatement: string;
  targetUser: string;
  currentBehavior: string;
  desiredBehavior: string;
  measurableOutcome: string;
  dataClassification: DataClassification;
  constraints: string[];
  nonGoals: string[];
  affectedSystems: string[];
  dependencies: string[];
  decisionAuthority: string;
  unresolvedQuestions: UnresolvedQuestion[];
  acceptanceCriteria: AcceptanceCriterion[];
  createdAt: Date;
}

export interface CreateWorkItemInput {
  projectId: string;
  organizationId: string;
  title: string;
  type: string;
  state?: string;
  riskLevel: string;
  ownerId: string;
  problemStatement: string;
  targetUser: string;
  currentBehavior?: string;
  desiredBehavior: string;
  measurableOutcome?: string;
  dataClassification: string;
  constraints?: string[];
  nonGoals?: string[];
  affectedSystems?: string[];
  dependencies?: string[];
  decisionAuthority?: string;
  unresolvedQuestions?: UnresolvedQuestion[];
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface CreateWorkItemMetadata {
  id: string;
  lineageId: string;
  createdAt: Date;
}

export interface ReviseWorkItemInput {
  title?: string;
  type?: string;
  state?: string;
  riskLevel?: string;
  ownerId?: string;
  problemStatement?: string;
  targetUser?: string;
  currentBehavior?: string;
  desiredBehavior?: string;
  measurableOutcome?: string;
  dataClassification?: string;
  constraints?: string[];
  nonGoals?: string[];
  affectedSystems?: string[];
  dependencies?: string[];
  decisionAuthority?: string;
  unresolvedQuestions?: UnresolvedQuestion[];
  acceptanceCriteria?: AcceptanceCriterion[];
}

export interface ReviseWorkItemMetadata {
  id: string;
  createdAt: Date;
}

function assertWorkItemType(type: string): WorkItemType {
  if (!(WORK_ITEM_TYPES as readonly string[]).includes(type)) {
    throw new Error("Work item type is invalid");
  }

  return type as WorkItemType;
}

function assertWorkItemState(state: string): WorkItemState {
  if (!(WORK_ITEM_STATES as readonly string[]).includes(state)) {
    throw new Error("Work item state is invalid");
  }

  return state as WorkItemState;
}

function assertWorkItemRiskLevel(riskLevel: string): WorkItemRiskLevel {
  if (!(WORK_ITEM_RISK_LEVELS as readonly string[]).includes(riskLevel)) {
    throw new Error("Work item risk level is invalid");
  }

  return riskLevel as WorkItemRiskLevel;
}

function assertDataClassification(dataClassification: string): DataClassification {
  if (!(DATA_CLASSIFICATIONS as readonly string[]).includes(dataClassification)) {
    throw new Error("Data classification is invalid");
  }

  return dataClassification as DataClassification;
}

function normalizeStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function normalizeAcceptanceCriteria(criteria: AcceptanceCriterion[]): AcceptanceCriterion[] {
  if (criteria.length === 0) {
    throw new Error("At least one acceptance criterion is required");
  }

  return criteria.map((criterion) => {
    const given = criterion.given.trim();
    const when = criterion.when.trim();
    const then = criterion.then.trim();

    if (given.length === 0 || when.length === 0 || then.length === 0) {
      throw new Error("Acceptance criterion fields are required");
    }

    return { given, when, then };
  });
}

function assertRequiredText(value: string, fieldName: string, minimumLength: number): string {
  const normalized = value.trim();

  if (normalized.length < minimumLength) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeUnresolvedQuestions(
  values: UnresolvedQuestion[] | undefined,
): UnresolvedQuestion[] {
  return (values ?? [])
    .map((entry) => ({
      question: entry.question.trim(),
      blocking: entry.blocking,
    }))
    .filter((entry) => entry.question.length > 0);
}

function buildWorkItemFields(input: {
  title: string;
  type: string;
  state?: string;
  riskLevel: string;
  ownerId: string;
  problemStatement: string;
  targetUser: string;
  currentBehavior?: string;
  desiredBehavior: string;
  measurableOutcome?: string;
  dataClassification: string;
  constraints?: string[];
  nonGoals?: string[];
  affectedSystems?: string[];
  dependencies?: string[];
  decisionAuthority?: string;
  unresolvedQuestions?: UnresolvedQuestion[];
  acceptanceCriteria: AcceptanceCriterion[];
}): Pick<
  WorkItem,
  | "title"
  | "type"
  | "state"
  | "riskLevel"
  | "ownerId"
  | "problemStatement"
  | "targetUser"
  | "currentBehavior"
  | "desiredBehavior"
  | "measurableOutcome"
  | "dataClassification"
  | "constraints"
  | "nonGoals"
  | "affectedSystems"
  | "dependencies"
  | "decisionAuthority"
  | "unresolvedQuestions"
  | "acceptanceCriteria"
> {
  return {
    title: assertRequiredText(input.title, "Title", 3),
    type: assertWorkItemType(input.type),
    state: assertWorkItemState(input.state ?? "draft"),
    riskLevel: assertWorkItemRiskLevel(input.riskLevel),
    ownerId: assertRequiredText(input.ownerId, "Owner identifier", 1),
    problemStatement: assertRequiredText(input.problemStatement, "Problem statement", 10),
    targetUser: assertRequiredText(input.targetUser, "Target user", 2),
    currentBehavior: input.currentBehavior?.trim() ?? "",
    desiredBehavior: assertRequiredText(input.desiredBehavior, "Desired behavior", 10),
    measurableOutcome: input.measurableOutcome?.trim() ?? "",
    dataClassification: assertDataClassification(input.dataClassification),
    constraints: normalizeStringList(input.constraints),
    nonGoals: normalizeStringList(input.nonGoals),
    affectedSystems: normalizeStringList(input.affectedSystems),
    dependencies: normalizeStringList(input.dependencies),
    decisionAuthority: input.decisionAuthority?.trim() ?? "",
    unresolvedQuestions: normalizeUnresolvedQuestions(input.unresolvedQuestions),
    acceptanceCriteria: normalizeAcceptanceCriteria(input.acceptanceCriteria),
  };
}

export function createWorkItem(
  input: CreateWorkItemInput,
  metadata: CreateWorkItemMetadata,
): WorkItem {
  const projectId = input.projectId.trim();
  const organizationId = input.organizationId.trim();

  if (projectId.length === 0) {
    throw new Error("Project identifier is required");
  }

  if (organizationId.length === 0) {
    throw new Error("Organization identifier is required");
  }

  return {
    id: metadata.id,
    lineageId: metadata.lineageId,
    version: 1,
    projectId,
    organizationId,
    createdAt: metadata.createdAt,
    ...buildWorkItemFields(input),
  };
}

export function createWorkItemRevision(
  previous: WorkItem,
  input: ReviseWorkItemInput,
  metadata: ReviseWorkItemMetadata,
): WorkItem {
  if (previous.version < 1) {
    throw new Error("Previous work item version is invalid");
  }

  return {
    id: metadata.id,
    lineageId: previous.lineageId,
    version: previous.version + 1,
    projectId: previous.projectId,
    organizationId: previous.organizationId,
    createdAt: metadata.createdAt,
    ...buildWorkItemFields({
      title: input.title ?? previous.title,
      type: input.type ?? previous.type,
      state: input.state ?? previous.state,
      riskLevel: input.riskLevel ?? previous.riskLevel,
      ownerId: input.ownerId ?? previous.ownerId,
      problemStatement: input.problemStatement ?? previous.problemStatement,
      targetUser: input.targetUser ?? previous.targetUser,
      currentBehavior: input.currentBehavior ?? previous.currentBehavior,
      desiredBehavior: input.desiredBehavior ?? previous.desiredBehavior,
      measurableOutcome: input.measurableOutcome ?? previous.measurableOutcome,
      dataClassification: input.dataClassification ?? previous.dataClassification,
      constraints: input.constraints ?? previous.constraints,
      nonGoals: input.nonGoals ?? previous.nonGoals,
      affectedSystems: input.affectedSystems ?? previous.affectedSystems,
      dependencies: input.dependencies ?? previous.dependencies,
      decisionAuthority: input.decisionAuthority ?? previous.decisionAuthority,
      unresolvedQuestions: input.unresolvedQuestions ?? previous.unresolvedQuestions,
      acceptanceCriteria: input.acceptanceCriteria ?? previous.acceptanceCriteria,
    }),
  };
}
