import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InitiativeWizardTrack } from "@/components/initiative-wizard-track";
import { type InitiativeWizardStepId } from "@/lib/initiative-defaults";
import { getInitiativeDetail } from "@/lib/initiative-queries";
import { getDashboardData } from "@/lib/queries";

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
    case "building":
    case "uat":
    case "production":
    case "ops_handoff":
      return "brd";
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
        selectedFramingTitle={detail.selectedFramingTitle}
      />

      <section className="panel detail-section">
        <h2>Homework export</h2>
        <p className="page-description">Download Markdown bundles for Skool homework posts.</p>
        <div className="detail-grid">
          <a className="button-link" href={`/initiatives/${initiativeId}/export/1`}>
            Week 1 export
          </a>
          <a className="button-link" href={`/initiatives/${initiativeId}/export/2`}>
            Week 2 export
          </a>
          <a className="button-link" href={`/initiatives/${initiativeId}/export/3`}>
            Week 3 export
          </a>
        </div>
      </section>
    </AppShell>
  );
}
