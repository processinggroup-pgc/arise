import {
  buildWorkItemOutcomeCostSummary,
  createWorkItemOutcome,
  evaluateWorkItemOutcomeReadiness,
  PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD,
  proposeGovernedImprovements,
  type TenantContext,
  type WorkItemOutcome,
  type WorkItemOutcomeReadinessEvaluation,
} from "@arise/domain";

import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { IdentityOperationContext } from "../identity/identity-store.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { ReleaseEvidenceStore } from "../verification/release-evidence-store.js";
import type { CostAttributionStore } from "./cost-attribution-store.js";
import type { IncidentStore } from "./incident-store.js";
import type { TechnicalDebtStore } from "./technical-debt-store.js";
import type { WorkItemOutcomeStore } from "./work-item-outcome-store.js";

export interface EvaluateWorkItemOutcomeCommand {
  tenantContext: TenantContext;
  workItemId: string;
  evaluationWindowClosedAt: Date;
  lessons?: string[];
}

export interface EvaluateWorkItemOutcomeResult {
  outcome: WorkItemOutcome;
  readiness: WorkItemOutcomeReadinessEvaluation;
}

export class WorkItemOutcomeNotReadyError extends Error {
  constructor(
    message: string,
    readonly readiness: WorkItemOutcomeReadinessEvaluation,
  ) {
    super(message);
    this.name = "WorkItemOutcomeNotReadyError";
  }
}

function latestCostAttribution<T extends { attributedAt: Date }>(records: T[]): T | undefined {
  if (records.length === 0) {
    return undefined;
  }

  let latest = records[0];
  for (const record of records) {
    if (record.attributedAt.getTime() > latest.attributedAt.getTime()) {
      latest = record;
    }
  }

  return latest;
}

function selectLatestReleaseEvidence<T extends { generatedAt: Date; complete: boolean; status: string }>(
  records: T[],
): T | undefined {
  if (records.length === 0) {
    return undefined;
  }

  let latest = records[0];
  for (const record of records) {
    if (record.generatedAt.getTime() > latest.generatedAt.getTime()) {
      latest = record;
    }
  }

  return latest;
}

export async function evaluateWorkItemOutcome(
  command: EvaluateWorkItemOutcomeCommand,
  workItemStore: WorkItemStore,
  costAttributionStore: CostAttributionStore,
  incidentStore: IncidentStore,
  technicalDebtStore: TechnicalDebtStore,
  releaseEvidenceStore: ReleaseEvidenceStore,
  workItemOutcomeStore: WorkItemOutcomeStore,
  operationContext: IdentityOperationContext,
): Promise<EvaluateWorkItemOutcomeResult> {
  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  if (workItem.state !== "released") {
    throw new AgentRunScopeError("Work item outcome can only be evaluated after release");
  }

  const costAttributions = await costAttributionStore.listCostAttributionsForWorkItem(command.workItemId);
  const latestCost = latestCostAttribution(costAttributions);
  const incidents = await incidentStore.listIncidentsForWorkItem(command.workItemId);
  const technicalDebt = await technicalDebtStore.listTechnicalDebtForWorkItem(command.workItemId);
  const releaseEvidenceRecords = await releaseEvidenceStore.listReleaseEvidenceForWorkItem(
    command.workItemId,
  );
  const latestReleaseEvidence = selectLatestReleaseEvidence(releaseEvidenceRecords);

  const openTechnicalDebt = technicalDebt.filter(
    (item) => item.status === "open" || item.status === "in_progress",
  );
  const openHighRiskDebt = openTechnicalDebt.filter((item) => item.risk === "high");

  const readiness = evaluateWorkItemOutcomeReadiness({
    hasCostAttribution: latestCost !== undefined,
    incidentCount: incidents.length,
    openTechnicalDebtCount: openTechnicalDebt.length,
    releaseEvidenceComplete: latestReleaseEvidence?.complete === true,
    evaluationWindowClosed: command.evaluationWindowClosedAt.getTime() <= operationContext.now().getTime(),
  });

  if (!readiness.complete) {
    throw new WorkItemOutcomeNotReadyError(readiness.blockers.join("; "), readiness);
  }

  const cost = buildWorkItemOutcomeCostSummary(
    latestCost === undefined
      ? {
          totalCostUsd: 0,
          modelCostUsd: 0,
          buildCostUsd: 0,
          sandboxCostUsd: 0,
        }
      : {
          totalCostUsd: latestCost.totalCostUsd,
          modelCostUsd: latestCost.modelCostUsd,
          buildCostUsd: latestCost.buildCostUsd,
          sandboxCostUsd: latestCost.sandboxCostUsd,
        },
  );

  const recommendations = proposeGovernedImprovements({
    incidentCount: incidents.length,
    openHighRiskDebtCount: openHighRiskDebt.length,
    totalCostUsd: cost.totalCostUsd,
    budgetThresholdUsd: PLATFORM_WORK_ITEM_BUDGET_THRESHOLD_USD,
  });

  const outcome = createWorkItemOutcome(
    {
      organizationId: command.tenantContext.organizationId,
      workItemId: command.workItemId,
      workItemVersion: workItem.version,
      evaluationWindowClosedAt: command.evaluationWindowClosedAt,
      releaseSuccessful: latestReleaseEvidence?.status === "complete",
      hasCostAttribution: latestCost !== undefined,
      releaseEvidenceComplete: latestReleaseEvidence?.complete === true,
      cost,
      incidentCount: incidents.length,
      openTechnicalDebtCount: openTechnicalDebt.length,
      lessons: command.lessons ?? [],
      recommendations,
    },
    {
      id: operationContext.createId(),
      evaluatedAt: operationContext.now(),
    },
  );

  await workItemOutcomeStore.saveWorkItemOutcome(outcome);

  return {
    outcome,
    readiness,
  };
}
