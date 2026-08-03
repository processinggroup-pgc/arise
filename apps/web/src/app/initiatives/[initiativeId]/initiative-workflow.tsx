"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { MarketResearchDossier } from "@arise/domain";

import { alignProblemFramingAction, runMarketResearchAction } from "./actions";

interface InitiativeWorkflowProps {
  initiativeId: string;
  state: string;
  dossier?: MarketResearchDossier | undefined;
  selectedFramingTitle?: string | undefined;
}

export function InitiativeWorkflow({
  initiativeId,
  state,
  dossier,
  selectedFramingTitle,
}: InitiativeWorkflowProps): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  if (state === "problem_captured") {
    return (
      <section className="panel detail-section">
        <h2>Run market research</h2>
        <p className="page-description">
          ARISE will research how similar products and labor-market programs have addressed cohort
          affordability and employability during hiring downturns.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <button
          className="button-primary"
          disabled={isPending}
          type="button"
          onClick={() => {
            startTransition(async () => {
              setError(undefined);
              const result = await runMarketResearchAction(initiativeId);
              if (result.error !== undefined) {
                setError(result.error);
                return;
              }

              router.refresh();
            });
          }}
        >
          {isPending ? "Researching..." : "Generate research dossier"}
        </button>
      </section>
    );
  }

  if (state === "research_complete" && dossier !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Research summary</h2>
        <p>{dossier.summary}</p>

        <div className="detail-grid">
          <article className="criteria-card">
            <strong>Market trends</strong>
            <ul className="detail-list">
              {dossier.marketTrends.map((trend) => (
                <li key={trend}>{trend}</li>
              ))}
            </ul>
          </article>

          <article className="criteria-card">
            <strong>Comparable approaches</strong>
            <ul className="detail-list">
              {dossier.comparableApproaches.map((approach) => (
                <li key={approach.name}>
                  <strong>{approach.name}</strong> — {approach.approachSummary}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <form
          className="form-panel"
          action={async (formData) => {
            startTransition(async () => {
              setError(undefined);
              const result = await alignProblemFramingAction(initiativeId, formData);
              if (result.error !== undefined) {
                setError(result.error);
                return;
              }

              router.refresh();
            });
          }}
        >
          <h2>Choose the problem framing that best fits</h2>
          <div className="framing-options">
            {dossier.framingOptions.map((option) => (
              <label key={option.id} className="framing-option">
                <input
                  defaultChecked={
                    option.alignmentScore ===
                    Math.max(...dossier.framingOptions.map((item) => item.alignmentScore))
                  }
                  name="selectedFramingId"
                  required
                  type="radio"
                  value={option.id}
                />
                <span className="framing-option-body">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                  <span className="stat-hint">{option.rationale}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="form-field form-field-wide">
            <span className="form-label">Elaborate or refine this framing</span>
            <textarea
              className="form-input form-textarea"
              name="userElaboration"
              placeholder="Example: prioritize scholarships for unemployed applicants in the first 90 days."
              rows={3}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Saving alignment..." : "Confirm problem alignment"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "problem_aligned") {
    return (
      <section className="panel detail-section">
        <h2>Problem aligned</h2>
        <p>
          Selected framing: <strong>{selectedFramingTitle ?? "Confirmed"}</strong>
        </p>
        <p className="page-description">
          Next up: BRD generation, three product solution options, MVP backlog finalization, and
          architecture approval before build.connect flows begin.
        </p>
      </section>
    );
  }

  return (
    <section className="panel detail-section empty-state">
      <p>Initiative state: {state.replaceAll("_", " ")}</p>
    </section>
  );
}
