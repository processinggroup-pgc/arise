import type { FindingStatus } from "./finding.js";
import { FINDING_STATUSES } from "./finding.js";

export function assertFindingStatus(status: string): FindingStatus {
  if (!(FINDING_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Finding status is invalid");
  }

  return status as FindingStatus;
}
