"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type {
  BuildBundle,
  CohortDiscoveryBundle,
  MarketResearchDossier,
  TechnicalDesignBundle,
} from "@arise/domain";
import type { DetectedPlatformEnv } from "@/lib/platform-env-format";
import { formatDetectedSupabaseSummary, formatDetectedVercelSummary } from "@/lib/platform-env-format";

import {
  applyEnhancementsAction,
  beginPlatformSetupAction,
  connectPlatformsFromEnvAction,
  connectPlatformsManualAction,
  connectPlatformsVercelManagedAction,
  runUatAction,
  startMvpBuildAction,
} from "./build-actions";
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
  suggestBusinessConceptAction,
  suggestFeatureWishListAction,
  suggestRevenueHypothesisAction,
} from "./cohort-actions";
import { runMarketResearchAction } from "./actions";

interface InitiativeWorkflowProps {
  initiativeId: string;
  state: string;
  dossier?: MarketResearchDossier | undefined;
  bundle?: CohortDiscoveryBundle | undefined;
  technicalBundle?: TechnicalDesignBundle | undefined;
  buildBundle?: BuildBundle | undefined;
  detectedPlatforms?: DetectedPlatformEnv | undefined;
  selectedFramingTitle?: string | undefined;
  openAiConfigured?: boolean;
}

function formatVercelConnectionSummary(
  vercel: NonNullable<BuildBundle["platformConnections"]>["vercel"],
): string {
  if (vercel.projectId.length > 0) {
    return vercel.projectId.startsWith("pending-")
      ? `New project ${vercel.projectId} (assigned at build)`
      : vercel.projectId;
  }

  if (vercel.teamId.length > 0) {
    return `Team ${vercel.teamId} — new project per initiative`;
  }

  return "Vercel connected";
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

function mergeSuggestionsIntoFields(current: string[], suggestions: string[]): string[] {
  return current.map((value, index) => (value.trim().length > 0 ? value : (suggestions[index] ?? "")));
}

function mergeSuggestionField(current: string, suggestion: string | undefined): string {
  return current.trim().length > 0 ? current : (suggestion ?? "");
}

function isBusinessConceptSuggested(
  suggestions: CohortDiscoveryBundle["businessConceptSuggestions"],
): boolean {
  return (
    suggestions !== undefined &&
    suggestions.problem.trim().length > 0 &&
    suggestions.customer.trim().length > 0 &&
    suggestions.solution.trim().length > 0 &&
    suggestions.whyNow.trim().length > 0 &&
    suggestions.topRisks.some((risk) => risk.trim().length > 0)
  );
}

function isRevenueHypothesisSuggested(
  suggestions: CohortDiscoveryBundle["revenueHypothesisSuggestions"],
): boolean {
  return (
    suggestions !== undefined &&
    suggestions.chosenModel.trim().length > 0 &&
    suggestions.pricingStartingPoint.trim().length > 0 &&
    suggestions.killerAssumption.trim().length > 0
  );
}

function FinalizeConceptForm({
  initiativeId,
  dossier,
  bundle,
  error,
  isPending,
  onSubmit,
}: {
  initiativeId: string;
  dossier: MarketResearchDossier;
  bundle?: CohortDiscoveryBundle | undefined;
  error?: string | undefined;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}): React.JSX.Element {
  const router = useRouter();
  const suggestions = bundle?.businessConceptSuggestions;
  const autoSuggestStarted = useRef(false);
  const [isSuggesting, startSuggest] = useTransition();
  const [problem, setProblem] = useState(() => suggestions?.problem ?? "");
  const [customer, setCustomer] = useState(() => suggestions?.customer ?? "");
  const [solution, setSolution] = useState(() => suggestions?.solution ?? "");
  const [whyNow, setWhyNow] = useState(() => suggestions?.whyNow ?? "");
  const [topRisks, setTopRisks] = useState(() => suggestions?.topRisks.join("\n") ?? "");

  useEffect(() => {
    if (isBusinessConceptSuggested(suggestions)) {
      setProblem((current) => mergeSuggestionField(current, suggestions?.problem));
      setCustomer((current) => mergeSuggestionField(current, suggestions?.customer));
      setSolution((current) => mergeSuggestionField(current, suggestions?.solution));
      setWhyNow((current) => mergeSuggestionField(current, suggestions?.whyNow));
      setTopRisks((current) =>
        current.trim().length > 0 ? current : (suggestions?.topRisks.join("\n") ?? ""),
      );
      return;
    }
    if (autoSuggestStarted.current) {
      return;
    }
    autoSuggestStarted.current = true;
    startSuggest(async () => {
      await suggestBusinessConceptAction(initiativeId);
      router.refresh();
    });
  }, [initiativeId, router, suggestions]);

  const suggestPending = isPending || isSuggesting;
  const defaultFramingId =
    dossier.framingOptions.find(
      (option) =>
        option.alignmentScore ===
        Math.max(...dossier.framingOptions.map((item) => item.alignmentScore)),
    )?.id ?? dossier.framingOptions[0]?.id;

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("problem", problem);
        formData.set("customer", customer);
        formData.set("solution", solution);
        formData.set("whyNow", whyNow);
        formData.set("topRisks", topRisks);
        onSubmit(formData);
      }}
    >
      <h3>Finalize business concept</h3>
      <p className="page-description">
        Concept fields are suggested from your research dossier. Edit any field before finalizing.
      </p>
      <div className="framing-options">
        {dossier.framingOptions.map((option) => (
          <label key={option.id} className="framing-option">
            <input
              defaultChecked={option.id === defaultFramingId}
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
        <input
          className="form-input"
          name="problem"
          required
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Customer</span>
        <input
          className="form-input"
          name="customer"
          required
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Solution</span>
        <input
          className="form-input"
          name="solution"
          required
          value={solution}
          onChange={(event) => setSolution(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Why now</span>
        <input
          className="form-input"
          name="whyNow"
          required
          value={whyNow}
          onChange={(event) => setWhyNow(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Top 3 risks (one per line)</span>
        <textarea
          className="form-input form-textarea"
          name="topRisks"
          required
          rows={3}
          value={topRisks}
          onChange={(event) => setTopRisks(event.target.value)}
        />
      </label>
      <ActionButton
        disabled={suggestPending}
        label="Suggest concept"
        pendingLabel="Suggesting..."
        onClick={() => {
          startSuggest(async () => {
            await suggestBusinessConceptAction(initiativeId, { force: true });
            router.refresh();
          });
        }}
      />
      <label className="form-field form-field-wide">
        <span className="form-label">Session notes</span>
        <textarea className="form-input form-textarea" name="sessionNotesWeek1" rows={3} />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Elaborate framing (optional)</span>
        <textarea className="form-input form-textarea" name="userElaboration" rows={2} />
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      <button className="button-primary" disabled={suggestPending} type="submit">
        {suggestPending ? "Saving..." : "Finalize concept"}
      </button>
    </form>
  );
}

function MvpScopingForm({
  initiativeId,
  bundle,
  error,
  isPending,
  onSubmit,
}: {
  initiativeId: string;
  bundle?: CohortDiscoveryBundle | undefined;
  error?: string | undefined;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}): React.JSX.Element {
  const router = useRouter();
  const suggestions = bundle?.featureWishListSuggestions ?? [];
  const autoSuggestStarted = useRef(false);
  const [isSuggesting, startSuggest] = useTransition();
  const [features, setFeatures] = useState<string[]>(() =>
    [0, 1, 2, 3, 4].map((index) => suggestions[index] ?? ""),
  );

  useEffect(() => {
    if (suggestions.length >= 3) {
      setFeatures((current) => mergeSuggestionsIntoFields(current, suggestions));
      return;
    }
    if (autoSuggestStarted.current) {
      return;
    }
    autoSuggestStarted.current = true;
    startSuggest(async () => {
      await suggestFeatureWishListAction(initiativeId);
      router.refresh();
    });
  }, [initiativeId, router, suggestions]);

  const suggestPending = isPending || isSuggesting;

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData();
        features.forEach((feature, index) => {
          formData.set(`feature${String(index + 1)}`, feature);
        });
        const sessionNotes = event.currentTarget.querySelector<HTMLTextAreaElement>(
          'textarea[name="sessionNotesWeek2"]',
        );
        if (sessionNotes !== null) {
          formData.set("sessionNotesWeek2", sessionNotes.value);
        }
        onSubmit(formData);
      }}
    >
      <h3>Feature wish list (pre-work: 5 features)</h3>
      <p className="page-description">
        Suggestions are generated from your business case. Edit any feature before scoping the MVP.
      </p>
      {[1, 2, 3, 4, 5].map((index) => (
        <label key={index} className="form-field form-field-wide">
          <span className="form-label">Feature {String(index)}</span>
          <input
            className="form-input"
            name={`feature${String(index)}`}
            required={index <= 3}
            value={features[index - 1] ?? ""}
            onChange={(event) => {
              const next = [...features];
              next[index - 1] = event.target.value;
              setFeatures(next);
            }}
          />
        </label>
      ))}
      <ActionButton
        disabled={suggestPending}
        label="Suggest features"
        pendingLabel="Suggesting..."
        onClick={() => {
          startSuggest(async () => {
            await suggestFeatureWishListAction(initiativeId, { force: true });
            router.refresh();
          });
        }}
      />
      <label className="form-field form-field-wide">
        <span className="form-label">Session notes</span>
        <textarea className="form-input form-textarea" name="sessionNotesWeek2" rows={3} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button-primary" disabled={suggestPending} type="submit">
        {suggestPending ? "Scoping..." : "Generate MVP scope (1–2 features)"}
      </button>
    </form>
  );
}

function MvpFinalizeForm({
  initiativeId,
  bundle,
  error,
  isPending,
  onSubmit,
}: {
  initiativeId: string;
  bundle?: CohortDiscoveryBundle | undefined;
  error?: string | undefined;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
}): React.JSX.Element {
  const router = useRouter();
  const suggestions = bundle?.revenueHypothesisSuggestions;
  const autoSuggestStarted = useRef(false);
  const [isSuggesting, startSuggest] = useTransition();
  const modelFallback = bundle?.businessCase?.revenueModelOptions[0] ?? "";
  const assumptionFallback = bundle?.businessConcept?.topRisks[0] ?? "";
  const [chosenModel, setChosenModel] = useState(
    () => suggestions?.chosenModel ?? modelFallback,
  );
  const [pricingStartingPoint, setPricingStartingPoint] = useState(
    () => suggestions?.pricingStartingPoint ?? "",
  );
  const [killerAssumption, setKillerAssumption] = useState(
    () => suggestions?.killerAssumption ?? assumptionFallback,
  );

  useEffect(() => {
    if (isRevenueHypothesisSuggested(suggestions)) {
      setChosenModel((current) => mergeSuggestionField(current, suggestions?.chosenModel));
      setPricingStartingPoint((current) =>
        mergeSuggestionField(current, suggestions?.pricingStartingPoint),
      );
      setKillerAssumption((current) => mergeSuggestionField(current, suggestions?.killerAssumption));
      return;
    }
    if (autoSuggestStarted.current) {
      return;
    }
    autoSuggestStarted.current = true;
    startSuggest(async () => {
      await suggestRevenueHypothesisAction(initiativeId);
      router.refresh();
    });
  }, [initiativeId, router, suggestions]);

  const suggestPending = isPending || isSuggesting;

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.set("chosenModel", chosenModel);
        formData.set("pricingStartingPoint", pricingStartingPoint);
        formData.set("killerAssumption", killerAssumption);
        onSubmit(formData);
      }}
    >
      <p className="page-description">
        Revenue fields are suggested from your business case and MVP scope. Edit before finalizing.
      </p>
      <label className="form-field form-field-wide">
        <span className="form-label">Chosen revenue model</span>
        <input
          className="form-input"
          name="chosenModel"
          required
          value={chosenModel}
          onChange={(event) => setChosenModel(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Pricing starting point</span>
        <input
          className="form-input"
          name="pricingStartingPoint"
          required
          value={pricingStartingPoint}
          onChange={(event) => setPricingStartingPoint(event.target.value)}
        />
      </label>
      <label className="form-field form-field-wide">
        <span className="form-label">Killer assumption</span>
        <input
          className="form-input"
          name="killerAssumption"
          required
          value={killerAssumption}
          onChange={(event) => setKillerAssumption(event.target.value)}
        />
      </label>
      <ActionButton
        disabled={suggestPending}
        label="Suggest revenue hypothesis"
        pendingLabel="Suggesting..."
        onClick={() => {
          startSuggest(async () => {
            await suggestRevenueHypothesisAction(initiativeId, { force: true });
            router.refresh();
          });
        }}
      />
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button-primary" disabled={suggestPending} type="submit">
        {suggestPending ? "Finalizing..." : "Run MVP stress test & finalize"}
      </button>
    </form>
  );
}

export function InitiativeWorkflow({
  initiativeId,
  state,
  dossier,
  bundle,
  technicalBundle,
  buildBundle,
  detectedPlatforms,
  selectedFramingTitle,
  openAiConfigured = false,
}: InitiativeWorkflowProps): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string; warning?: string }>) => {
    startTransition(async () => {
      setError(undefined);
      setWarning(undefined);
      const result = await action();
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      if (result.warning !== undefined) {
        setWarning(result.warning);
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
          {!openAiConfigured && bundle?.dualAiComparison === undefined ? (
            <p className="form-warning">
              OPENAI_API_KEY is not configured on the server. The comparison will use a
              rule-based fallback instead of ChatGPT until the key is set and the app is
              redeployed.
            </p>
          ) : null}
          {bundle?.dualAiComparison !== undefined ? (
            <div className="detail-grid">
              <article className="criteria-card">
                <strong>Claude</strong>
                <p>{bundle.dualAiComparison.claudeSummary}</p>
              </article>
              <article className="criteria-card">
                <strong>
                  {bundle.dualAiComparison.secondarySource === "rule_based"
                    ? "Rule-based fallback"
                    : "ChatGPT"}
                </strong>
                <p>{bundle.dualAiComparison.openAiSummary}</p>
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
          {bundle?.dualAiComparison?.secondaryWarning !== undefined ? (
            <p className="form-warning">{bundle.dualAiComparison.secondaryWarning}</p>
          ) : null}
          {warning ? <p className="form-warning">{warning}</p> : null}
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

        <FinalizeConceptForm
          bundle={bundle}
          dossier={dossier}
          error={error}
          initiativeId={initiativeId}
          isPending={isPending}
          onSubmit={(formData) => run(() => finalizeConceptAction(initiativeId, formData))}
        />
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
        <MvpScopingForm
          bundle={bundle}
          error={error}
          initiativeId={initiativeId}
          isPending={isPending}
          onSubmit={(formData) => run(() => generateMvpScopeAction(initiativeId, formData))}
        />
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
        <MvpFinalizeForm
          bundle={bundle}
          error={error}
          initiativeId={initiativeId}
          isPending={isPending}
          onSubmit={(formData) => run(() => finalizeMvpAction(initiativeId, formData))}
        />
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
        <h2>Step 5 — Connect platforms &amp; build MVP</h2>
        <p className="page-description">
          Step 4 is complete. Connect Supabase, Vercel, and Resend, then ARISE will ingest your BRD
          and technical design to scaffold the MVP.
        </p>
        {technicalBundle?.systemValidation !== undefined ? (
          <p>{technicalBundle.systemValidation.userFlowAlignment}</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Begin platform setup"
          pendingLabel="Starting..."
          onClick={() => run(() => beginPlatformSetupAction(initiativeId))}
        />
      </section>
    );
  }

  if (state === "platform_setup") {
    const envReady =
      detectedPlatforms !== undefined &&
      detectedPlatforms.supabase.available &&
      detectedPlatforms.vercel.available &&
      detectedPlatforms.resend.available;
    const vercelManagedReady =
      detectedPlatforms !== undefined && detectedPlatforms.vercelManagedStackReady;

    return (
      <section className="panel detail-section">
        <h2>Step 5 — Connect Supabase, Vercel &amp; Resend</h2>
        <p className="page-description">
          {envReady
            ? "Your environment already has the required credentials. Connect in one click, or walk through manual setup below."
            : vercelManagedReady
              ? "Use the Vercel-managed stack to link GitHub and Supabase through Vercel (recommended)."
              : "Add credentials to .env for seamless setup, or enter secret references manually (never paste raw keys in the browser)."}
        </p>

        {detectedPlatforms !== undefined ? (
          <div className="detail-grid">
            <article className="criteria-card">
              <strong>Supabase</strong>
              <p>{formatDetectedSupabaseSummary(detectedPlatforms.supabase)}</p>
            </article>
            <article className="criteria-card">
              <strong>Vercel</strong>
              <p>
                {detectedPlatforms.vercel.available
                  ? formatDetectedVercelSummary(detectedPlatforms.vercel)
                  : "Missing VERCEL_TOKEN and VERCEL_TEAM_ID (or VERCEL_PROJECT_ID)"}
              </p>
            </article>
            <article className="criteria-card">
              <strong>Resend</strong>
              <p>
                {detectedPlatforms.resend.available
                  ? `From ${detectedPlatforms.resend.fromEmail}`
                  : "Missing RESEND_API_KEY or RESEND_FROM_EMAIL"}
              </p>
            </article>
          </div>
        ) : null}

        {vercelManagedReady ? (
          <article className="criteria-card form-panel">
            <h3>Recommended: Vercel-managed stack</h3>
            <p className="page-description">
              Vercel connects GitHub and Supabase separately, but the Supabase marketplace integration
              syncs database env vars into each Vercel project automatically. Starting the MVP build
              creates a new Vercel project via the API.
            </p>
            <ol className="detail-list">
              <li>Create or open the Vercel project for this initiative.</li>
              <li>
                Connect GitHub: Project → <strong>Settings → Git</strong> → connect your repo.
              </li>
              <li>
                Add Supabase: Project → <strong>Settings → Integrations</strong> → install{" "}
                <strong>Supabase</strong> and link/create a database.
              </li>
              <li>
                Pull synced vars locally:{" "}
                <code>npx vercel env pull .env.local</code>
              </li>
            </ol>
            {error ? <p className="form-error">{error}</p> : null}
            <ActionButton
              disabled={isPending}
              label="Connect via Vercel-managed stack"
              pendingLabel="Connecting..."
              onClick={() => run(() => connectPlatformsVercelManagedAction(initiativeId))}
            />
          </article>
        ) : null}

        {error && !vercelManagedReady ? <p className="form-error">{error}</p> : null}

        {envReady ? (
          <ActionButton
            disabled={isPending}
            label="Connect all from environment"
            pendingLabel="Connecting..."
            onClick={() => run(() => connectPlatformsFromEnvAction(initiativeId))}
          />
        ) : null}

        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => connectPlatformsManualAction(initiativeId, formData));
          }}
        >
          <h3>Manual setup (secret references)</h3>
          <p className="page-description">
            Use values like <code>env:DATABASE_URL</code> or your vault secret ref — not raw API keys.
          </p>
          <div className="detail-grid">
            <label className="form-field">
              <span className="form-label">Supabase project ref</span>
              <input className="form-input" name="supabaseProjectRef" placeholder="your-project-ref" />
            </label>
            <label className="form-field">
              <span className="form-label">Database URL ref</span>
              <input className="form-input" name="supabaseDatabaseUrlRef" placeholder="env:DATABASE_URL" />
            </label>
            <label className="form-field">
              <span className="form-label">Anon key ref</span>
              <input
                className="form-input"
                name="supabaseAnonKeyRef"
                placeholder="env:NEXT_PUBLIC_SUPABASE_ANON_KEY"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Vercel team ID</span>
              <input
                className="form-input"
                name="vercelTeamId"
                placeholder="team_... (required for per-initiative projects)"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Vercel token ref</span>
              <input className="form-input" name="vercelTokenRef" placeholder="env:VERCEL_TOKEN" />
            </label>
            <label className="form-field">
              <span className="form-label">Vercel project ID (optional)</span>
              <input
                className="form-input"
                name="vercelProjectId"
                placeholder="Leave blank to create a project per initiative"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Resend API key ref</span>
              <input className="form-input" name="resendApiKeyRef" placeholder="env:RESEND_API_KEY" />
            </label>
            <label className="form-field">
              <span className="form-label">Resend from email</span>
              <input className="form-input" name="resendFromEmail" placeholder="hello@yourdomain.com" />
            </label>
          </div>
          <button className="button-primary" disabled={isPending} type="submit">
            {isPending ? "Connecting..." : "Save manual platform connections"}
          </button>
        </form>
      </section>
    );
  }

  if (state === "platforms_connected") {
    return (
      <section className="panel detail-section">
        <h2>Step 5 — Build MVP from documentation</h2>
        <p className="page-description">
          Platforms are connected. ARISE will create a project and work items from your BRD story map
          MVP tasks, aligned with your Step 4 architecture.
        </p>
        {buildBundle?.platformConnections !== undefined ? (
          <ul className="detail-list">
            <li>
              Stack:{" "}
              {buildBundle.platformConnections.stackMode === "vercel_managed"
                ? "Vercel-managed (GitHub + Supabase integration)"
                : "Manual env refs"}
            </li>
            <li>Supabase: {buildBundle.platformConnections.supabase.projectRef}</li>
            <li>Vercel: {formatVercelConnectionSummary(buildBundle.platformConnections.vercel)}</li>
            {buildBundle.platformConnections.github !== undefined ? (
              <li>GitHub: linked via Vercel Git settings</li>
            ) : null}
            <li>Resend: {buildBundle.platformConnections.resend.fromEmail}</li>
          </ul>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <ActionButton
          disabled={isPending}
          label="Start MVP build"
          pendingLabel="Building..."
          onClick={() => run(() => startMvpBuildAction(initiativeId))}
        />
      </section>
    );
  }

  if ((state === "build_in_progress" || state === "building") && buildBundle?.buildPlan !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 5 — MVP build {state === "building" ? "complete" : "in progress"}</h2>
        <p>{buildBundle.buildPlan.summary}</p>
        {buildBundle.buildPlan.vercelProjectUrl !== undefined ? (
          <p className="page-description">
            <a className="button-link" href={buildBundle.buildPlan.vercelProjectUrl}>
              Open Vercel project
            </a>
          </p>
        ) : null}
        {buildBundle.projectId !== undefined ? (
          <p className="page-description">Project ID: {buildBundle.projectId}</p>
        ) : null}
        <ul className="detail-list">
          {buildBundle.buildPlan.tasks.map((task) => (
            <li key={task.title}>
              {task.title} — {task.status.replaceAll("_", " ")}
            </li>
          ))}
        </ul>
        {state === "building" ? (
          <>
            {error ? <p className="form-error">{error}</p> : null}
            <ActionButton
              disabled={isPending}
              label="Proceed to Step 6 — UAT"
              pendingLabel="Starting UAT..."
              onClick={() => run(() => runUatAction(initiativeId))}
            />
          </>
        ) : null}
      </section>
    );
  }

  if (state === "uat" && buildBundle?.uatReport !== undefined) {
    return (
      <section className="panel detail-section">
        <h2>Step 6 — UAT &amp; enhancements backlog</h2>
        <p>{buildBundle.uatReport.summary}</p>
        <ul className="detail-list">
          {buildBundle.uatReport.checklist.map((item) => (
            <li key={item.id}>
              {item.passed ? "✓" : "✗"} {item.description}
            </li>
          ))}
        </ul>

        {buildBundle.enhancementsBacklog.length > 0 ? (
          <form
            className="form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              run(() => applyEnhancementsAction(initiativeId, formData));
            }}
          >
            <h3>Enhancements backlog</h3>
            <p className="page-description">
              Select deferred features from MVP scope and gap analysis to queue for post-MVP work.
            </p>
            {buildBundle.enhancementsBacklog.map((item) => (
              <label key={item.id} className="framing-option">
                <input defaultChecked={item.applied} name="enhancementId" type="checkbox" value={item.id} />
                <span className="framing-option-body">
                  <strong>{item.title}</strong>
                  <span className="page-description">Source: {item.source.replaceAll("_", " ")}</span>
                </span>
              </label>
            ))}
            {error ? <p className="form-error">{error}</p> : null}
            <button className="button-primary" disabled={isPending} type="submit">
              {isPending ? "Applying..." : "Apply selected enhancements — complete Step 6"}
            </button>
          </form>
        ) : (
          <>
            {error ? <p className="form-error">{error}</p> : null}
            <ActionButton
              disabled={isPending}
              label="Complete Step 6 — no enhancements selected"
              pendingLabel="Completing..."
              onClick={() =>
                run(() => applyEnhancementsAction(initiativeId, new FormData()))
              }
            />
          </>
        )}
      </section>
    );
  }

  if (state === "production" || state === "ops_handoff") {
    const applied = buildBundle?.enhancementsBacklog.filter((item) => item.applied) ?? [];
    return (
      <section className="panel detail-section">
        <h2>Step 6 complete — MVP in production</h2>
        <p className="page-description">
          Your MVP is built, UAT passed, and {applied.length} enhancement(s) queued for follow-up work.
        </p>
        {applied.length > 0 ? (
          <ul className="detail-list">
            {applied.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
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
