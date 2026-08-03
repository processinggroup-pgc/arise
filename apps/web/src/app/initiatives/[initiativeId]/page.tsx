import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InitiativeWizardTrack } from "@/components/initiative-wizard-track";
import { getInitiativeDetail } from "@/lib/initiative-queries";
import { getDashboardData } from "@/lib/queries";

import { InitiativeWorkflow } from "./initiative-workflow";

interface InitiativePageProps {
  params: Promise<{ initiativeId: string }>;
}

function resolveWizardStep(state: string): "problem" | "research" | "alignment" | "brd" | "solutions" | "mvp" {
  if (state === "problem_captured") {
    return "research";
  }
  if (state === "research_complete") {
    return "alignment";
  }
  if (state === "problem_aligned") {
    return "brd";
  }
  return "problem";
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
    <AppShell activePath="/initiatives/new" organizationName={dashboard.organization.name}>
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
        selectedFramingTitle={detail.selectedFramingTitle}
      />
    </AppShell>
  );
}
