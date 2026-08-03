"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { CohortDiscoveryBundle, MarketResearchDossier, TechnicalDesignBundle } from "@arise/domain";

import {
  approveTechnicalDesignAction,
  generateArchitectureAction,
  generateDataModelAction,
  generateGapAnalysisAction,
  generateTechStackAction,
} from "./technical-design-actions";
import {
  approveDesignAction,
  assembleBrdAction,
  finalizeConceptAction,
  finalizeMvpAction,
  generateBusinessCaseAction,
  generateMvpScopeAction,
  generatePersonaAction,
  generateStoryMapAction,
  generateUserFlowAction,
  runStressTestAction,
  saveDualAiComparisonAction,
} from "./cohort-actions";
import { runMarketResearchAction } from "./actions";

interface InitiativeWorkflowProps {
  initiativeId: string;
  state: string;
  dossier?: MarketResearchDossier | undefined;
  bundle?: CohortDiscoveryBundle | undefined;
  technicalBundle?: TechnicalDesignBundle | undefined;
  selectedFramingTitle?: string | undefined;
}

function ActionButton({
  label,
  pendingLabel,
  onClick,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  onClick: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <button className="button-primary" disabled={disabled} type="button" onClick={onClick}>
      {disabled ? pendingLabel : label}
    </button>
  );
}

function ArtifactList({ title, items }: { title: string; items: string[] }): React.JSX.Element {
  return (
    <article className="criteria-card">
      <strong>{title}</strong>
      <ul className="detail-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export function InitiativeWorkflow({
  initiativeId,
  state,
  dossier,
  bundle,
  technicalBundle,
  selectedFramingTitle,
}: InitiativeWorkflowProps): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      setError(undefined);
      const result = await action();
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  if (state === "problem_captured") {
    return (
      <section className="panel detail-section">
        <h2>Step 1 — Run market research</h2>
        <p className="page-description">
          ARISE generates a research dossier using Claude (or rule-based fallback). After research,
          you will compare dual-AI outputs, stress-test the idea, and finalize your concept.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate research dossier"
          pendingLabel="Researching..."
          onClick={() => run(() => runMarketResearchAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "research_complete" && dossier !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 1 — AI refinement &amp; finalize concept</h2>
        <p>{dossier.summary}</p>

        <div className="detail-grid">
          <ArtifactList title="Market trends" items={dossier.marketTrends} />
          <ArtifactList
            title="Comparable approaches"
            items={dossier.comparableApproaches.map((a) => `${a.name}: ${a.approachSummary}`)}
          />
        </div>

        <div className="form-panel">
          <h3>Dual-AI comparison (Claude + ChatGPT)</h3>
          <p className="page-description">
            Compare Claude research with the same prompt run through ChatGPT.
          </p>
          {bundle?.dualAiComparison !== undefined ? (
            <div className="detail-grid">
              <article className="criteria-card">
                <strong>Claude</strong>
                <p>{bundle.dualAiComparison.claudeSummary}</p>
              </article>
              <article className="criteria-card">
                <strong>ChatGPT</strong>
                <p>
                  {bundle.dualAiComparison.openAiSummary ??
                    (
                      bundle.dualAiComparison as { ruleBasedSummary?: string }
                    ).ruleBasedSummary ??
                    ""}
                </p>
              </article>
            </div>
          ) : (
            <ActionButton
              disabled={isPending}
              label="Run dual-AI comparison"
              pendingLabel="Comparing..."
              onClick={() => run(() => saveDualAiComparisonAction(initiativeId))}
            />
          )}
        </div>

        <div className="form-panel">
          <h3>Stress test</h3>
          {bundle?.stressTest !== undefined ? (
            <div className="detail-grid">
              <ArtifactList title="Failure modes" items={bundle.stressTest.failureModes} />
              <ArtifactList title="Non-users" items={bundle.stressTest.nonUsers} />
              <ArtifactList title="Wrong assumptions" items={bundle.stressTest.wrongAssumptions} />
            </div>
          ) : (
            <ActionButton
              disabled={isPending}
              label="Run aggressive stress test"
              pendingLabel="Stress testing..."
              onClick={() => run(() => runStressTestAction(initiativeId))}
            />
          )}
        </div>

        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => finalizeConceptAction(initiativeId, formData));
          }}
        >
          <h3>Finalize business concept</h3>
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
                </span>
              </label>
            ))}
          </div>

          <label className="form-field form-field-wide">
            <span className="form-label">Problem (one sentence)</span>
            <input className="form-input" name="problem" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Customer</span>
            <input className="form-input" name="customer" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Solution</span>
            <input className="form-input" name="solution" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Why now</span>
            <input className="form-input" name="whyNow" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Top 3 risks (one per line)</span>
            <textarea className="form-input form-textarea" name="topRisks" required rows={3} />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Session notes</span>
            <textarea className="form-input form-textarea" name="sessionNotesWeek1" rows={3} />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Elaborate framing (optional)</span>
            <textarea className="form-input form-textarea" name="userElaboration" rows={2} />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Finalize concept"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "problem_aligned") {
    return (
      <section className="panel detail-section">
        <h2>Step 2 — Business case</h2>
        <p>
          Concept finalized: <strong>{selectedFramingTitle ?? "Confirmed"}</strong>
        </p>
        {bundle?.businessConcept !== undefined ? (
          <ul className="detail-list">
            <li>Problem: {bundle.businessConcept.problem}</li>
            <li>Customer: {bundle.businessConcept.customer}</li>
            <li>Solution: {bundle.businessConcept.solution}</li>
          </ul>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate business case"
          pendingLabel="Generating..."
          onClick={() => run(() => generateBusinessCaseAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "business_case_complete") {
    return (
      <section className="panel detail-section">
        <h2>Step 2 — MVP scoping</h2>
        {bundle?.businessCase !== undefined ? (
          <ul className="detail-list">
            <li>Value: {bundle.businessCase.valueProposition}</li>
            <li>Acquisition: {bundle.businessCase.acquisitionStrategy}</li>
          </ul>
        ) : null}
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => generateMvpScopeAction(initiativeId, formData));
          }}
        >
          <h3>Feature wish list (pre-work: 5 features)</h3>
          {[1, 2, 3, 4, 5].map((index) => (
            <label key={index} className="form-field form-field-wide">
              <span className="form-label">Feature {String(index)}</span>
              <input className="form-input" name={`feature${String(index)}`} required={index <= 3} />
            </label>
          ))}
          <label className="form-field form-field-wide">
            <span className="form-label">Session notes</span>
            <textarea className="form-input form-textarea" name="sessionNotesWeek2" rows={3} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Scoping..." : "Generate MVP scope (1–2 features)"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "solution_selected") {
    return (
      <section className="panel detail-section">
        <h2>Step 2 — MVP finalize</h2>
        {bundle?.mvpScope !== undefined ? (
          <div className="detail-grid">
            <ArtifactList title="Core features" items={bundle.mvpScope.coreFeatures} />
            <ArtifactList title="What NOT to build" items={bundle.mvpScope.notToBuild} />
          </div>
        ) : null}
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => finalizeMvpAction(initiativeId, formData));
          }}
        >
          <label className="form-field form-field-wide">
            <span className="form-label">Chosen revenue model</span>
            <input className="form-input" name="chosenModel" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Pricing starting point</span>
            <input className="form-input" name="pricingStartingPoint" required />
          </label>
          <label className="form-field form-field-wide">
            <span className="form-label">Killer assumption</span>
            <input className="form-input" name="killerAssumption" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Finalizing..." : "Run MVP stress test & finalize"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "mvp_finalized") {
    return (
      <section className="panel detail-section">
        <h2>Step 3 — Persona</h2>
        {bundle?.simplicityCheck !== undefined ? (
          <p className="page-description">30% cut: {bundle.simplicityCheck}</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate validated persona"
          pendingLabel="Generating..."
          onClick={() => run(() => generatePersonaAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "persona_complete" && bundle?.persona !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 3 — User flow</h2>
        <p>
          <strong>{bundle.persona.name}</strong> — {bundle.persona.role} ({bundle.persona.incomeLevel})
        </p>
        <p className="page-description">Pay trigger: {bundle.persona.payTrigger}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate primary user flow (max 5 steps)"
          pendingLabel="Generating..."
          onClick={() => run(() => generateUserFlowAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "userflow_complete" && bundle?.userFlow !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 3 — Story map</h2>
        <ol className="detail-list">
          {bundle.userFlow.steps.map((step) => (
            <li key={step.stepNumber}>
              {step.userAction} → {step.systemResponse}
            </li>
          ))}
        </ol>
        <p>Value: {bundle.userFlow.valueDelivered}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate story map"
          pendingLabel="Generating..."
          onClick={() => run(() => generateStoryMapAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "storymap_complete" && bundle?.storyMap !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 3 — BRD build</h2>
        {bundle.storyMap.steps.map((step) => (
          <article key={step.stepTitle} className="criteria-card">
            <strong>{step.stepTitle}</strong>
            <ul className="detail-list">
              {step.tasks.map((task) => (
                <li key={task.title}>
                  {task.title} {task.inMvp ? "(MVP)" : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Assemble build-ready BRD"
          pendingLabel="Assembling..."
          onClick={() => run(() => assembleBrdAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "brd_draft" && bundle?.brd !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 3 — Review &amp; approve BRD</h2>
        <pre className="form-textarea" style={{ whiteSpace: "pre-wrap" }}>
          {bundle.brd.fullDocument}
        </pre>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => approveDesignAction(initiativeId, formData));
          }}
        >
          <label className="form-field form-field-wide">
            <span className="form-label">Session notes</span>
            <textarea className="form-input form-textarea" name="sessionNotesWeek3" rows={3} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Approving..." : "Approve design — Steps 1–3 complete"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "design_approved") {
    return (
      <section className="panel detail-section">
        <h2>Step 4 — System architecture</h2>
        <p className="page-description">
          Steps 1–3 are complete. Design a simple architecture you can explain in 60 seconds —
          frontend, backend, database, and APIs.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate system architecture"
          pendingLabel="Generating..."
          onClick={() => run(() => generateArchitectureAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "architecture_complete" && technicalBundle?.architecture !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 4 — Tech stack</h2>
        <p>{technicalBundle.architecture.summary}</p>
        <ul className="detail-list">
          <li>Frontend: {technicalBundle.architecture.frontend}</li>
          <li>Backend: {technicalBundle.architecture.backend}</li>
          <li>Database: {technicalBundle.architecture.database}</li>
          <li>APIs: {technicalBundle.architecture.apis}</li>
        </ul>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Recommend tech stack"
          pendingLabel="Generating..."
          onClick={() => run(() => generateTechStackAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "stack_selected" && technicalBundle?.techStack !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 4 — Data model</h2>
        <ul className="detail-list">
          <li>Frontend: {technicalBundle.techStack.frontend}</li>
          <li>Backend: {technicalBundle.techStack.backend}</li>
          <li>Database: {technicalBundle.techStack.database}</li>
          <li>Hosting: {technicalBundle.techStack.hosting}</li>
        </ul>
        <p className="page-description">{technicalBundle.techStack.rationale}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Generate data model (2–4 entities)"
          pendingLabel="Generating..."
          onClick={() => run(() => generateDataModelAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "data_model_complete" && technicalBundle?.dataModel !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 4 — Gap analysis</h2>
        {technicalBundle.dataModel.entities.map((entity) => (
          <article key={entity.name} className="criteria-card">
            <strong>{entity.name}</strong>
            <p>Fields: {entity.fields.join(", ")}</p>
            <p>Relationships: {entity.relationships.join("; ")}</p>
          </article>
        ))}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Run gap analysis against BRD"
          pendingLabel="Analyzing..."
          onClick={() => run(() => generateGapAnalysisAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "gap_analysis_complete" && technicalBundle?.gapAnalysis !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 4 — System validation</h2>
        <div className="detail-grid">
          <ArtifactList title="Missing features" items={technicalBundle.gapAnalysis.missingFeatures} />
          <ArtifactList title="Edge cases" items={technicalBundle.gapAnalysis.edgeCases} />
          <ArtifactList title="Technical risks" items={technicalBundle.gapAnalysis.technicalRisks} />
          <ArtifactList title="Silent failures" items={technicalBundle.gapAnalysis.silentFailures} />
        </div>
        {technicalBundle.deeperGapCheck !== undefined ? (
          <div className="detail-grid">
            <ArtifactList title="Failure modes" items={technicalBundle.deeperGapCheck.failureModes} />
            <ArtifactList title="Weak assumptions" items={technicalBundle.deeperGapCheck.weakAssumptions} />
          </div>
        ) : null}
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => approveTechnicalDesignAction(initiativeId, formData));
          }}
        >
          <label className="form-field form-field-wide">
            <span className="form-label">Session notes</span>
            <textarea className="form-input form-textarea" name="sessionNotesStep4" rows={3} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Validating..." : "Validate design — Step 4 complete"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "technical_design_approved") {
    return (
      <section className="panel detail-section">
        <h2>Step 4 complete — ready to build</h2>
        <p className="page-description">
          Architecture, stack, data model, and gap analysis are approved. Export your Step 4 homework
          bundle below, then proceed to Step 5 when wired.
        </p>
        {technicalBundle?.systemValidation !== undefined ? (
          <p>{technicalBundle.systemValidation.userFlowAlignment}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="panel detail-section empty-state">
      <p>Initiative state: {state.replaceAll("_", " ")}</p>
    </section>
  );
}
