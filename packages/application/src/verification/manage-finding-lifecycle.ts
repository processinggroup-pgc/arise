import {
  FindingLifecycleError,
  markFindingFalsePositive,
  resolveFinding,
  startFindingRemediation,
  waiveFinding,
  type Finding,
  type TenantContext,
} from "@arise/domain";

import type { FindingStore } from "./finding-store.js";

export interface ManageFindingCommand {
  tenantContext: TenantContext;
  findingId: string;
}

export class FindingScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FindingScopeError";
  }
}

async function loadTenantScopedFinding(
  findingStore: FindingStore,
  findingId: string,
  tenantContext: TenantContext,
): Promise<Finding> {
  const finding = await findingStore.findFindingById(findingId);
  if (finding === undefined) {
    throw new FindingScopeError("Finding was not found");
  }

  if (finding.organizationId !== tenantContext.organizationId) {
    throw new FindingScopeError("Finding is outside the tenant scope");
  }

  return finding;
}

export async function startFindingRemediationForWorkItem(
  command: ManageFindingCommand,
  findingStore: FindingStore,
  updatedAt: Date,
): Promise<Finding> {
  const finding = await loadTenantScopedFinding(findingStore, command.findingId, command.tenantContext);

  try {
    const updated = startFindingRemediation(finding, updatedAt);
    await findingStore.saveFinding(updated);
    return updated;
  } catch (error) {
    if (error instanceof FindingLifecycleError) {
      throw error;
    }

    throw error;
  }
}

export async function resolveFindingForWorkItem(
  command: ManageFindingCommand,
  findingStore: FindingStore,
  resolvedAt: Date,
): Promise<Finding> {
  const finding = await loadTenantScopedFinding(findingStore, command.findingId, command.tenantContext);

  try {
    const updated = resolveFinding(finding, resolvedAt);
    await findingStore.saveFinding(updated);
    return updated;
  } catch (error) {
    if (error instanceof FindingLifecycleError) {
      throw error;
    }

    throw error;
  }
}

export async function waiveFindingForWorkItem(
  command: ManageFindingCommand,
  findingStore: FindingStore,
  updatedAt: Date,
): Promise<Finding> {
  const finding = await loadTenantScopedFinding(findingStore, command.findingId, command.tenantContext);

  try {
    const updated = waiveFinding(finding, updatedAt);
    await findingStore.saveFinding(updated);
    return updated;
  } catch (error) {
    if (error instanceof FindingLifecycleError) {
      throw error;
    }

    throw error;
  }
}

export async function markFindingFalsePositiveForWorkItem(
  command: ManageFindingCommand,
  findingStore: FindingStore,
  updatedAt: Date,
): Promise<Finding> {
  const finding = await loadTenantScopedFinding(findingStore, command.findingId, command.tenantContext);

  try {
    const updated = markFindingFalsePositive(finding, updatedAt);
    await findingStore.saveFinding(updated);
    return updated;
  } catch (error) {
    if (error instanceof FindingLifecycleError) {
      throw error;
    }

    throw error;
  }
}
