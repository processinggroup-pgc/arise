export const WORK_ITEM_STATES = [
  "draft",
  "assessing",
  "not_ready",
  "ready_for_recommendation",
  "recommendation_pending",
  "plan_approved",
  "implementing",
  "verifying",
  "preview_ready",
  "release_review",
  "released",
  "rejected",
  "cancelled",
] as const;

export type WorkItemState = (typeof WORK_ITEM_STATES)[number];

export const WORK_ITEM_TRANSITIONS = [
  "start_assessment",
  "readiness_failed",
  "readiness_passed",
  "retry_assessment",
  "submit_recommendation",
  "approve_plan",
  "reject_recommendation",
  "start_implementation",
  "start_verification",
  "mark_preview_ready",
  "request_release_review",
  "release",
  "reject_release",
  "cancel",
] as const;

export type WorkItemTransition = (typeof WORK_ITEM_TRANSITIONS)[number];

const NON_TERMINAL_STATES: WorkItemState[] = [
  "draft",
  "assessing",
  "not_ready",
  "ready_for_recommendation",
  "recommendation_pending",
  "plan_approved",
  "implementing",
  "verifying",
  "preview_ready",
  "release_review",
];

const TRANSITION_TARGETS: Record<WorkItemTransition, WorkItemState> = {
  start_assessment: "assessing",
  readiness_failed: "not_ready",
  readiness_passed: "ready_for_recommendation",
  retry_assessment: "assessing",
  submit_recommendation: "recommendation_pending",
  approve_plan: "plan_approved",
  reject_recommendation: "rejected",
  start_implementation: "implementing",
  start_verification: "verifying",
  mark_preview_ready: "preview_ready",
  request_release_review: "release_review",
  release: "released",
  reject_release: "rejected",
  cancel: "cancelled",
};

const TRANSITION_SOURCES: Record<WorkItemTransition, readonly WorkItemState[]> = {
  start_assessment: ["draft"],
  readiness_failed: ["assessing"],
  readiness_passed: ["assessing"],
  retry_assessment: ["not_ready"],
  submit_recommendation: ["ready_for_recommendation"],
  approve_plan: ["recommendation_pending"],
  reject_recommendation: ["recommendation_pending"],
  start_implementation: ["plan_approved"],
  start_verification: ["implementing"],
  mark_preview_ready: ["verifying"],
  request_release_review: ["preview_ready"],
  release: ["release_review"],
  reject_release: ["release_review"],
  cancel: NON_TERMINAL_STATES,
};

export class WorkItemTransitionError extends Error {
  constructor(
    message: string,
    readonly currentState: WorkItemState,
    readonly transition: WorkItemTransition,
  ) {
    super(message);
    this.name = "WorkItemTransitionError";
  }
}

export function transitionWorkItemState(
  currentState: WorkItemState,
  transition: WorkItemTransition,
): WorkItemState {
  const targetState = TRANSITION_TARGETS[transition];

  if (currentState === targetState) {
    return currentState;
  }

  const allowedSources = TRANSITION_SOURCES[transition];
  if (!allowedSources.includes(currentState)) {
    throw new WorkItemTransitionError(
      `Transition '${transition}' is not allowed from state '${currentState}'`,
      currentState,
      transition,
    );
  }

  return targetState;
}

export function isTerminalWorkItemState(state: WorkItemState): boolean {
  return state === "released" || state === "rejected" || state === "cancelled";
}
