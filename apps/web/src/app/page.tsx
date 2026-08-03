import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { WorkItemTable } from "@/components/work-item-table";
import { getDashboardData } from "@/lib/queries";

export default async function HomePage(): Promise<React.JSX.Element> {
  const { organization, project, workItems, stats } = await getDashboardData();

  return (
    <AppShell activePath="/" organizationName={organization.name}>
      <header className="page-header">
        <div>
          <h1 className="page-title">ARISE Studio</h1>
          <p className="page-description">
            Governed build agent foundation for {project.name}. Track readiness, approvals,
            verification, and release evidence from one workspace.
          </p>
        </div>
        <Link className="button-link" href="/work-items">
          View all work items
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
