import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LifecycleTrack } from "@/components/lifecycle-track";
import { StatusBadge } from "@/components/status-badge";
import { getWorkItemById } from "@/lib/queries";

interface WorkItemDetailPageProps {
  params: Promise<{ workItemId: string }>;
}

export default async function WorkItemDetailPage({
  params,
}: WorkItemDetailPageProps): Promise<React.JSX.Element> {
  const { workItemId } = await params;
  const result = await getWorkItemById(workItemId);

  if (result === null) {
    notFound();
  }

  const { organization, project, workItem } = result;

  return (
    <AppShell activePath="/work-items">
      <header className="page-header">
        <div>
          <Link className="button-link" href="/work-items">
            Back to work items
          </Link>
          <h1 className="page-title">{workItem.title}</h1>
          <p className="page-description">{workItem.problemStatement}</p>
        </div>
        <div className="badge-row">
          <StatusBadge kind="type" value={workItem.type} />
          <StatusBadge kind="state" value={workItem.state} />
          <StatusBadge kind="risk" value={workItem.riskLevel} />
        </div>
      </header>

      <div className="layout-grid">
        <div className="detail-grid">
          <section className="panel detail-section">
            <h2>Lifecycle</h2>
            <LifecycleTrack currentState={workItem.state} />
          </section>

          <section className="panel detail-section">
            <h2>Intent</h2>
            <ul className="detail-list">
              <li>
                <strong>Target user:</strong> {workItem.targetUser}
              </li>
              <li>
                <strong>Desired behavior:</strong> {workItem.desiredBehavior}
              </li>
              {workItem.measurableOutcome.length > 0 ? (
                <li>
                  <strong>Measurable outcome:</strong> {workItem.measurableOutcome}
                </li>
              ) : null}
            </ul>
          </section>

          <section className="panel detail-section">
            <h2>Acceptance criteria</h2>
            <ul className="detail-list">
              {workItem.acceptanceCriteria.map((criterion, index) => (
                <li key={`${workItem.id}-criterion-${String(index)}`} className="criteria-card">
                  <strong>Scenario {index + 1}</strong>
                  <p>Given {criterion.given}</p>
                  <p>When {criterion.when}</p>
                  <p>Then {criterion.then}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="panel detail-section">
          <h2>Metadata</h2>
          <dl className="meta-list">
            <div className="meta-item">
              <dt className="meta-label">Project</dt>
              <dd className="meta-value">{project.name}</dd>
            </div>
            <div className="meta-item">
              <dt className="meta-label">Owner</dt>
              <dd className="meta-value">{workItem.ownerId}</dd>
            </div>
            <div className="meta-item">
              <dt className="meta-label">Data classification</dt>
              <dd className="meta-value">{workItem.dataClassification.replaceAll("_", " ")}</dd>
            </div>
            <div className="meta-item">
              <dt className="meta-label">Version</dt>
              <dd className="meta-value">v{workItem.version}</dd>
            </div>
            <div className="meta-item">
              <dt className="meta-label">Created</dt>
              <dd className="meta-value">{workItem.createdAt.toISOString().slice(0, 10)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
