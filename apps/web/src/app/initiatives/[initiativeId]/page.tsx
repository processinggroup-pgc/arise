import Link from "next/link";
import { notFound } from "next/navigation";

import { detectPlatformEnvFromProcessEnv } from "@arise/application";

import { AppShell } from "@/components/app-shell";
import { InitiativeWizardTrack } from "@/components/initiative-wizard-track";
import { type InitiativeWizardStepId } from "@/lib/initiative-defaults";
import { getInitiativeDetail } from "@/lib/initiative-queries";
import { getDashboardData } from "@/lib/queries";
import { isOpenAiConfigured } from "@/lib/dual-ai-generator";

import { InitiativeWorkflow } from "./initiative-workflow";

interface InitiativePageProps {
  params: Promise<{ initiativeId: string }>;
}

function resolveWizardStep(state: string): InitiativeWizardStepId {
  switch (state) {
    case "problem_captured":
      return "research";
    case "research_complete":
      return "alignment";
    case "problem_aligned":
      return "business-case";
    case "business_case_complete":
      return "mvp-scope";
    case "solution_selected":
      return "mvp-finalize";
    case "mvp_finalized":
      return "persona";
    case "persona_complete":
      return "userflow";
    case "userflow_complete":
      return "storymap";
    case "storymap_complete":
    case "brd_draft":
      return "brd";
    case "design_approved":
      return "architecture";
    case "architecture_complete":
      return "tech-stack";
    case "stack_selected":
      return "data-model";
    case "data_model_complete":
      return "gap-analysis";
    case "gap_analysis_complete":
      return "system-validation";
    case "technical_design_approved":
      return "platform-connect";
    case "platform_setup":
      return "platform-connect";
    case "platforms_connected":
      return "mvp-build";
    case "build_in_progress":
    case "building":
      return "mvp-build";
    case "uat":
      return "uat-test";
    case "production":
    case "ops_handoff":
      return "enhancements";
    default:
      return "problem";
  }
}

export default async function InitiativePage({
  params,
}: InitiativePageProps): Promise<React.JSX.Element> {
  const { initiativeId } = await params;
  const dashboard = await getDashboardData();
  const detail = await getInitiativeDetail(initiativeId);

  if (dashboard === null || detail === null) {
    notFound();
  }

  const wizardStep = resolveWizardStep(detail.initiative.state);
  const detectedPlatforms = detectPlatformEnvFromProcessEnv();

  return (
    <AppShell activePath="/initiatives/new">
      <header className="page-header">
        <div>
          <Link className="button-link" href="/initiatives/new">
            Start another initiative
          </Link>
          <h1 className="page-title">{detail.initiative.title}</h1>
          <p className="page-description">{detail.problemBrief.rawProblemDescription}</p>
        </div>
        <span className="badge badge-accent">{detail.initiative.state.replaceAll("_", " ")}</span>
      </header>

      <InitiativeWizardTrack activeStep={wizardStep} />

      <section className="panel detail-section">
        <h2>Problem brief</h2>
        <ul className="detail-list">
          <li>
            <strong>Audience:</strong> {detail.problemBrief.targetAudience}
          </li>
          <li>
            <strong>Desired outcome:</strong> {detail.problemBrief.desiredOutcome}
          </li>
          {detail.problemBrief.painPoints.map((painPoint) => (
            <li key={painPoint}>{painPoint}</li>
          ))}
        </ul>
      </section>

      <InitiativeWorkflow
        initiativeId={detail.initiative.id}
        state={detail.initiative.state}
        dossier={detail.dossier}
        bundle={detail.bundle}
        technicalBundle={detail.technicalBundle}
        buildBundle={detail.buildBundle}
        detectedPlatforms={detectedPlatforms}
        selectedFramingTitle={detail.selectedFramingTitle}
        openAiConfigured={isOpenAiConfigured()}
      />

      <section className="panel detail-section">
        <h2>Homework export</h2>
        <p className="page-description">Download Markdown bundles for Skool homework posts.</p>
        <div className="detail-grid">
          <a className="button-link" href={`/initiatives/${initiativeId}/export/1`}>
            Step 1 export
          </a>
          <a className="button-link" href={`/initiatives/${initiativeId}/export/2`}>
            Step 2 export
          </a>
          <a className="button-link" href={`/initiatives/${initiativeId}/export/3`}>
            Step 3 export
          </a>
          <a className="button-link" href={`/initiatives/${initiativeId}/export/4`}>
            Step 4 export
          </a>
        </div>
      </section>
    </AppShell>
  );
}
