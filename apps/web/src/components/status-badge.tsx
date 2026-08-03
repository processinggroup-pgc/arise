import type { WorkItemRiskLevel, WorkItemState, WorkItemType } from "@arise/domain";

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function stateBadgeClass(state: WorkItemState): string {
  if (state === "released") {
    return "badge badge-success";
  }

  if (state === "rejected" || state === "cancelled" || state === "not_ready") {
    return "badge badge-danger";
  }

  if (
    state === "recommendation_pending" ||
    state === "release_review" ||
    state === "preview_ready"
  ) {
    return "badge badge-warning";
  }

  if (state === "implementing" || state === "verifying" || state === "assessing") {
    return "badge badge-accent";
  }

  return "badge badge-neutral";
}

function riskBadgeClass(riskLevel: WorkItemRiskLevel): string {
  if (riskLevel === "critical" || riskLevel === "high") {
    return "badge badge-danger";
  }

  if (riskLevel === "medium") {
    return "badge badge-warning";
  }

  return "badge badge-success";
}

interface StatusBadgeProps {
  kind: "state" | "type" | "risk";
  value: WorkItemState | WorkItemType | WorkItemRiskLevel;
}

export function StatusBadge({ kind, value }: StatusBadgeProps): React.JSX.Element {
  if (kind === "state") {
    return <span className={stateBadgeClass(value as WorkItemState)}>{formatLabel(value)}</span>;
  }

  if (kind === "risk") {
    return <span className={riskBadgeClass(value as WorkItemRiskLevel)}>{formatLabel(value)}</span>;
  }

  return <span className="badge badge-info">{formatLabel(value)}</span>;
}
