import type { Finding } from "./finding.js";
import { assertFindingStatus } from "./finding-lifecycle-helpers.js";

export class FindingLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FindingLifecycleError";
  }
}

export function startFindingRemediation(finding: Finding, updatedAt: Date): Finding {
  if (finding.status !== "open") {
    throw new FindingLifecycleError("Only open findings can enter remediation");
  }

  return {
    ...finding,
    status: assertFindingStatus("in_remediation"),
    updatedAt,
  };
}

export function resolveFinding(finding: Finding, resolvedAt: Date): Finding {
  if (finding.status !== "open" && finding.status !== "in_remediation") {
    throw new FindingLifecycleError("Only open or in-remediation findings can be resolved");
  }

  return {
    ...finding,
    status: assertFindingStatus("resolved"),
    updatedAt: resolvedAt,
    resolvedAt,
  };
}

export function waiveFinding(finding: Finding, updatedAt: Date): Finding {
  if (finding.category === "security") {
    throw new FindingLifecycleError("Security findings cannot be waived");
  }

  if (finding.status !== "open" && finding.status !== "in_remediation") {
    throw new FindingLifecycleError("Only open or in-remediation findings can be waived");
  }

  return {
    ...finding,
    status: assertFindingStatus("waived"),
    updatedAt,
  };
}

export function markFindingFalsePositive(finding: Finding, updatedAt: Date): Finding {
  if (finding.category === "security") {
    throw new FindingLifecycleError("Security findings cannot be marked as false positives");
  }

  if (finding.status !== "open" && finding.status !== "in_remediation") {
    throw new FindingLifecycleError("Only open or in-remediation findings can be marked false positive");
  }

  return {
    ...finding,
    status: assertFindingStatus("false_positive"),
    updatedAt,
  };
}
