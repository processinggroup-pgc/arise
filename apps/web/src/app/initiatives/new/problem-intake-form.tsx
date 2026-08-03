"use client";

import { useActionState } from "react";

import { COHORT_AFFORDABILITY_DEFAULTS } from "@/lib/initiative-defaults";

import { createInitiativeAction, type CreateInitiativeFormState } from "./actions";

const initialState: CreateInitiativeFormState = {};

export function ProblemIntakeForm(): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(createInitiativeAction, initialState);

  return (
    <form action={formAction} className="form-panel">
      <div className="form-grid">
        <label className="form-field form-field-wide">
          <span className="form-label">Initiative title</span>
          <input
            className="form-input"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.title}
            name="title"
            required
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">What problem are we solving?</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.rawProblemDescription}
            name="rawProblemDescription"
            required
            rows={4}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Target audience</span>
          <input
            className="form-input"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.targetAudience}
            name="targetAudience"
            required
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Pain points (one per line)</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.painPoints}
            name="painPoints"
            required
            rows={4}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Business context</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.businessContext}
            name="businessContext"
            rows={3}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Desired outcome</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={COHORT_AFFORDABILITY_DEFAULTS.desiredOutcome}
            name="desiredOutcome"
            required
            rows={3}
          />
        </label>

        <h3 className="form-label">Rich ICP (Week 1)</h3>

        <label className="form-field form-field-wide">
          <span className="form-label">ICP role</span>
          <input
            className="form-input"
            defaultValue="Underemployed career changer"
            name="icpRole"
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Income level</span>
          <input className="form-input" defaultValue="$35k–$55k" name="icpIncomeLevel" />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Daily workflow</span>
          <textarea
            className="form-input form-textarea"
            defaultValue="Job search mornings, gig work afternoons, cohort research evenings"
            name="icpDailyWorkflow"
            rows={2}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Tools they use (one per line)</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={"LinkedIn\nNotion\nChatGPT\nSkool"}
            name="icpToolsUsed"
            rows={3}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Where they hang out online (one per line)</span>
          <textarea
            className="form-input form-textarea"
            defaultValue={"LinkedIn\nReddit r/careerguidance\nSkool communities"}
            name="icpOnlineHangouts"
            rows={3}
          />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Budget range for solutions like yours</span>
          <input className="form-input" defaultValue="$500–$2,000 upfront" name="icpBudgetRange" />
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="button-primary" disabled={isPending} type="submit">
        {isPending ? "Saving problem..." : "Start research phase"}
      </button>
    </form>
  );
}
