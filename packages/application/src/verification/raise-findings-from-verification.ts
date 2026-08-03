import {
  buildFindingEvidenceFromTestRun,
  buildFindingRemediationForFailedTestRun,
  buildFindingTitleForFailedTestRun,
  createFinding,
  listFailedTestRuns,
  mapTestCategoryToFindingCategory,
  mapTestCategoryToFindingSeverity,
  shouldRaiseFindingsFromVerification,
  type Finding,
  type TenantContext,
  type TestRun,
  type VerificationOrchestrationResult,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { AgentRunScopeError } from "../agent-runtime/create-agent-run.js";
import type { WorkItemStore } from "../intent/work-item-store.js";
import type { FindingStore } from "./finding-store.js";

export interface RaiseFindingsFromVerificationCommand {
  tenantContext: TenantContext;
  workItemId: string;
  runs: TestRun[];
  evaluation: VerificationOrchestrationResult;
}

export async function raiseFindingsFromVerification(
  command: RaiseFindingsFromVerificationCommand,
  workItemStore: WorkItemStore,
  findingStore: FindingStore,
  operationContext: IdentityOperationContext,
): Promise<Finding[]> {
  if (!shouldRaiseFindingsFromVerification(command.evaluation)) {
    return [];
  }

  const workItem = await workItemStore.findWorkItemVersionById(command.workItemId);
  if (workItem === undefined) {
    throw new AgentRunScopeError("Work item was not found");
  }

  if (workItem.organizationId !== command.tenantContext.organizationId) {
    throw new AgentRunScopeError("Work item is outside the tenant scope");
  }

  const failedRuns = listFailedTestRuns(command.runs);
  const findings: Finding[] = [];

  for (const run of failedRuns) {
    if (run.workItemId !== command.workItemId) {
      throw new AgentRunScopeError("Test run work item mismatch");
    }

    const finding = createFinding(
      {
        organizationId: command.tenantContext.organizationId,
        workItemId: command.workItemId,
        category: mapTestCategoryToFindingCategory(run.category),
        severity: mapTestCategoryToFindingSeverity(run.category),
        title: buildFindingTitleForFailedTestRun(run),
        evidence: buildFindingEvidenceFromTestRun(run),
        remediation: buildFindingRemediationForFailedTestRun(run),
      },
      {
        id: operationContext.createId(),
        raisedAt: operationContext.now(),
      },
    );

    await findingStore.saveFinding(finding);
    findings.push(finding);
  }

  return findings;
}
