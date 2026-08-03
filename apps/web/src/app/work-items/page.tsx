import { AppShell } from "@/components/app-shell";
import { WorkItemTable } from "@/components/work-item-table";
import { getDashboardData } from "@/lib/queries";

export default async function WorkItemsPage(): Promise<React.JSX.Element> {
  const { organization, project, workItems } = await getDashboardData();

  return (
    <AppShell activePath="/work-items" organizationName={organization.name}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Work Items</h1>
          <p className="page-description">
            ARISE lifecycle intents for {project.name}. Open a work item to review readiness,
            acceptance criteria, and current lifecycle state.
          </p>
        </div>
      </header>

      <section className="panel" aria-labelledby="work-item-list">
        <div className="panel-header">
          <h2 className="panel-title" id="work-item-list">
            {workItems.length} work items
          </h2>
        </div>
        <div className="panel-body">
          <WorkItemTable workItems={workItems} />
        </div>
      </section>
    </AppShell>
  );
}
