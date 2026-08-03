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
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="button-primary" disabled={isPending} type="submit">
        {isPending ? "Saving problem..." : "Start research phase"}
      </button>
    </form>
  );
}
