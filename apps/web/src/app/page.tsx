import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { WorkItemTable } from "@/components/work-item-table";
import { getDashboardData } from "@/lib/queries";

export default async function HomePage(): Promise<React.JSX.Element> {
  const dashboard = await getDashboardData();

  if (dashboard === null) {
    return (
      <AppShell activePath="/">
        <header className="page-header">
          <div>
            <h1 className="page-title">ARISE Studio</h1>
            <p className="page-description">
              Create an organization to start governed delivery with ARISE work items, approvals,
              and release evidence.
            </p>
          </div>
          <Link className="button-link" href="/organizations/new">
            Create organization
          </Link>
        </header>

        <section className="panel detail-section empty-state">
          <p>No organization is active in this browser session yet.</p>
          <p>After creating an organization, start at <strong>New Initiative</strong> to describe your problem.</p>
        </section>
      </AppShell>
    );
  }

  const { organization, project, workItems, stats } = dashboard;

  return (
    <AppShell activePath="/">
      <header className="page-header">
        <div>
          <h1 className="page-title">ARISE Studio</h1>
          <p className="page-description">
            Governed build agent foundation for {project.name}. Track readiness, approvals,
            verification, and release evidence from one workspace.
          </p>
        </div>
        <Link className="button-link" href="/initiatives/new">
          Start new initiative
        </Link>
      </header>

      <section className="stats-grid" aria-label="Workspace summary">
        <StatCard label="Work items" value={stats.total} hint="Active delivery intents" />
        <StatCard label="In progress" value={stats.inProgress} hint="Assessment through preview" />
        <StatCard
          label="Awaiting approval"
          value={stats.awaitingApproval}
          hint="Recommendation or release review"
        />
        <StatCard label="Released" value={stats.released} hint="Completed lifecycle outcomes" />
      </section>

      <section className="panel" aria-labelledby="recent-work-items">
        <div className="panel-header">
          <h2 className="panel-title" id="recent-work-items">
            Recent work items
          </h2>
          <span className="badge badge-neutral">{project.name}</span>
        </div>
        <div className="panel-body">
          <WorkItemTable workItems={workItems} />
        </div>
      </section>
    </AppShell>
  );
}
