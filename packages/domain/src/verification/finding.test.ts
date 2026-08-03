import { describe, expect, it } from "vitest";

import {
  createFinding,
  evaluateReleaseBlockingFindings,
  isReleaseBlockingFinding,
} from "./finding.js";
import {
  markFindingFalsePositive,
  resolveFinding,
  startFindingRemediation,
  waiveFinding,
  FindingLifecycleError,
} from "./finding-lifecycle.js";

const raisedAt = new Date("2026-08-03T12:00:00.000Z");

function buildFinding(
  overrides: Partial<Parameters<typeof createFinding>[0]> = {},
): ReturnType<typeof createFinding> {
  return createFinding(
    {
      organizationId: "org_123",
      workItemId: "work_item_1",
      category: "test",
      severity: "medium",
      title: "Verification failed for unit tests",
      evidence: "verification/session_1/unit/test_run_1.json",
      remediation: "Fix failing unit tests and re-run verification",
      ...overrides,
    },
    { id: "finding_1", raisedAt },
  );
}

describe("finding lifecycle", () => {
  it("transitions open findings through remediation to resolved", () => {
    const open = buildFinding();
    const inRemediation = startFindingRemediation(open, new Date("2026-08-03T12:05:00.000Z"));
    const resolved = resolveFinding(inRemediation, new Date("2026-08-03T12:30:00.000Z"));

    expect(inRemediation.status).toBe("in_remediation");
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).toBeDefined();
  });

  it("blocks waiving security findings", () => {
    const securityFinding = buildFinding({ category: "security", severity: "high" });

    expect(() => {
      waiveFinding(securityFinding, new Date("2026-08-03T12:10:00.000Z"));
    }).toThrow(FindingLifecycleError);
  });

  it("identifies critical security findings as release blockers", () => {
    const criticalSecurity = buildFinding({ category: "security", severity: "critical" });
    const resolved = resolveFinding(
      startFindingRemediation(criticalSecurity, new Date("2026-08-03T12:05:00.000Z")),
      new Date("2026-08-03T12:30:00.000Z"),
    );

    expect(isReleaseBlockingFinding(criticalSecurity)).toBe(true);
    expect(isReleaseBlockingFinding(resolved)).toBe(false);
    expect(evaluateReleaseBlockingFindings([criticalSecurity, buildFinding()])).toHaveLength(1);
  });

  it("allows non-security findings to be marked false positive", () => {
    const qualityFinding = buildFinding({ category: "quality" });
    const marked = markFindingFalsePositive(qualityFinding, new Date("2026-08-03T12:15:00.000Z"));

    expect(marked.status).toBe("false_positive");
  });
});
