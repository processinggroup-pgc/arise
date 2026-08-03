import type { WorkItemState } from "@arise/domain";

const PIPELINE_STATES: WorkItemState[] = [
  "draft",
  "assessing",
  "ready_for_recommendation",
  "plan_approved",
  "implementing",
  "verifying",
  "preview_ready",
  "release_review",
  "released",
];

const OFF_PIPELINE_STATES: WorkItemState[] = [
  "not_ready",
  "recommendation_pending",
  "rejected",
  "cancelled",
];

function formatState(state: WorkItemState): string {
  return state.replaceAll("_", " ");
}

function stateIndex(state: WorkItemState): number {
  const index = PIPELINE_STATES.indexOf(state);
  return index === -1 ? 0 : index;
}

interface LifecycleTrackProps {
  currentState: WorkItemState;
}

export function LifecycleTrack({ currentState }: LifecycleTrackProps): React.JSX.Element {
  const currentIndex = stateIndex(currentState);
  const isOffPipeline = OFF_PIPELINE_STATES.includes(currentState);

  return (
    <div className="lifecycle" aria-label="Work item lifecycle">
      {PIPELINE_STATES.map((state, index) => {
        let className = "lifecycle-step";
        if (state === currentState) {
          className += " active";
        } else if (index < currentIndex && !isOffPipeline) {
          className += " complete";
        }

        return (
          <span key={state} className={className}>
            {formatState(state)}
          </span>
        );
      })}
      {isOffPipeline ? (
        <span className="lifecycle-step active">{formatState(currentState)}</span>
      ) : null}
    </div>
  );
}
