export const TECHNICAL_DEBT_RISK_LEVELS = ["low", "medium", "high"] as const;
export type TechnicalDebtRiskLevel = (typeof TECHNICAL_DEBT_RISK_LEVELS)[number];

export const TECHNICAL_DEBT_STATUSES = ["open", "in_progress", "resolved", "waived"] as const;
export type TechnicalDebtStatus = (typeof TECHNICAL_DEBT_STATUSES)[number];

export interface TechnicalDebtItem {
  id: string;
  organizationId: string;
  projectId: string;
  sourceWorkItemId: string;
  description: string;
  risk: TechnicalDebtRiskLevel;
  ownerId: string;
  supportOwnerId?: string;
  dueDate: Date;
  status: TechnicalDebtStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTechnicalDebtItemInput {
  organizationId: string;
  projectId: string;
  sourceWorkItemId: string;
  description: string;
  risk: string;
  ownerId: string;
  dueDate: Date;
  supportOwnerId?: string;
}

export interface CreateTechnicalDebtItemMetadata {
  id: string;
  createdAt: Date;
}

export interface AssignTechnicalDebtSupportOwnerInput {
  supportOwnerId: string;
  updatedAt: Date;
}

export interface TechnicalDebtOverdueEvaluation {
  overdue: boolean;
  daysPastDue: number;
}

function assertTechnicalDebtRiskLevel(risk: string): TechnicalDebtRiskLevel {
  if (!(TECHNICAL_DEBT_RISK_LEVELS as readonly string[]).includes(risk)) {
    throw new Error("Technical debt risk level is invalid");
  }

  return risk as TechnicalDebtRiskLevel;
}

function assertTechnicalDebtStatus(status: string): TechnicalDebtStatus {
  if (!(TECHNICAL_DEBT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Technical debt status is invalid");
  }

  return status as TechnicalDebtStatus;
}

export function createTechnicalDebtItem(
  input: CreateTechnicalDebtItemInput,
  metadata: CreateTechnicalDebtItemMetadata,
): TechnicalDebtItem {
  const organizationId = input.organizationId.trim();
  const projectId = input.projectId.trim();
  const sourceWorkItemId = input.sourceWorkItemId.trim();
  const description = input.description.trim();
  const ownerId = input.ownerId.trim();
  const supportOwnerId = input.supportOwnerId?.trim();

  if (
    organizationId.length === 0 ||
    projectId.length === 0 ||
    sourceWorkItemId.length === 0 ||
    description.length === 0 ||
    ownerId.length === 0
  ) {
    throw new Error("Technical debt identifiers and description are required");
  }

  return {
    id: metadata.id,
    organizationId,
    projectId,
    sourceWorkItemId,
    description,
    risk: assertTechnicalDebtRiskLevel(input.risk),
    ownerId,
    ...(supportOwnerId !== undefined && supportOwnerId.length > 0 ? { supportOwnerId } : {}),
    dueDate: input.dueDate,
    status: "open",
    createdAt: metadata.createdAt,
    updatedAt: metadata.createdAt,
  };
}

export function assignTechnicalDebtSupportOwner(
  item: TechnicalDebtItem,
  input: AssignTechnicalDebtSupportOwnerInput,
): TechnicalDebtItem {
  if (item.status === "resolved" || item.status === "waived") {
    throw new Error("Resolved or waived technical debt cannot change support ownership");
  }

  const supportOwnerId = input.supportOwnerId.trim();
  if (supportOwnerId.length === 0) {
    throw new Error("Support owner identifier is required");
  }

  return {
    ...item,
    supportOwnerId,
    updatedAt: input.updatedAt,
  };
}

export function evaluateTechnicalDebtOverdue(
  item: TechnicalDebtItem,
  asOf: Date,
): TechnicalDebtOverdueEvaluation {
  if (item.status === "resolved" || item.status === "waived") {
    return {
      overdue: false,
      daysPastDue: 0,
    };
  }

  const millisPastDue = asOf.getTime() - item.dueDate.getTime();
  const daysPastDue = millisPastDue <= 0 ? 0 : Math.ceil(millisPastDue / 86_400_000);

  return {
    overdue: daysPastDue > 0,
    daysPastDue,
  };
}

export function resolveTechnicalDebtItem(item: TechnicalDebtItem, updatedAt: Date): TechnicalDebtItem {
  if (item.status === "resolved" || item.status === "waived") {
    throw new Error("Technical debt is already closed");
  }

  return {
    ...item,
    status: assertTechnicalDebtStatus("resolved"),
    updatedAt,
  };
}
