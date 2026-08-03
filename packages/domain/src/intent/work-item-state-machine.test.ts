import { describe, expect, it } from "vitest";

import {
  transitionWorkItemState,
  WORK_ITEM_TRANSITIONS,
  WorkItemTransitionError,
} from "./work-item-state-machine.js";

describe("transitionWorkItemState", () => {
  it("follows the assess to release happy path", () => {
    let state = transitionWorkItemState("draft", "start_assessment");
    expect(state).toBe("assessing");

    state = transitionWorkItemState(state, "readiness_passed");
    expect(state).toBe("ready_for_recommendation");

    state = transitionWorkItemState(state, "submit_recommendation");
    expect(state).toBe("recommendation_pending");

    state = transitionWorkItemState(state, "approve_plan");
    expect(state).toBe("plan_approved");

    state = transitionWorkItemState(state, "start_implementation");
    expect(state).toBe("implementing");

    state = transitionWorkItemState(state, "start_verification");
    expect(state).toBe("verifying");

    state = transitionWorkItemState(state, "mark_preview_ready");
    expect(state).toBe("preview_ready");

    state = transitionWorkItemState(state, "request_release_review");
    expect(state).toBe("release_review");

    state = transitionWorkItemState(state, "release");
    expect(state).toBe("released");
  });

  it("routes failed readiness to not_ready and allows retry", () => {
    expect(transitionWorkItemState("assessing", "readiness_failed")).toBe("not_ready");
    expect(transitionWorkItemState("not_ready", "retry_assessment")).toBe("assessing");
  });

  it("is idempotent when the transition target is already active", () => {
    expect(transitionWorkItemState("assessing", "start_assessment")).toBe("assessing");
    expect(transitionWorkItemState("released", "release")).toBe("released");
  });

  it("blocks invalid transitions", () => {
    expect(() => transitionWorkItemState("draft", "approve_plan")).toThrow(WorkItemTransitionError);
    expect(() => transitionWorkItemState("released", "start_assessment")).toThrow(
      WorkItemTransitionError,
    );
  });

  it("allows cancellation from non-terminal states", () => {
    for (const transition of WORK_ITEM_TRANSITIONS) {
      if (transition === "cancel") {
        continue;
      }

      const intermediateState = transitionWorkItemState("draft", "start_assessment");
      expect(transitionWorkItemState(intermediateState, "cancel")).toBe("cancelled");
    }
  });
});
