import Link from "next/link";

import { switchOrganizationAction } from "@/app/organizations/actions";
import { AppShell } from "@/components/app-shell";
import { listWorkspaceOrganizations, resolveWorkspaceContext } from "@/lib/workspace";

export default async function OrganizationsPage(): Promise<React.JSX.Element> {
  const workspace = await resolveWorkspaceContext();
  const organizations = await listWorkspaceOrganizations();
  const activeOrganizationId = workspace?.organizationId;

  return (
    <AppShell activePath="/organizations">
      <header className="page-header">
        <div>
          <h1 className="page-title">Your organizations</h1>
          <p className="page-description">
            Choose which organization to work in. Your browser session remembers the active
            workspace.
          </p>
        </div>
        <Link className="button-link" href="/organizations/new">
          Create organization
        </Link>
      </header>

      {organizations.length === 0 ? (
        <section className="panel detail-section empty-state">
          <p>No organizations are linked to this browser session yet.</p>
          <p>Create one to start product discovery and governed delivery.</p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="organization-list">
          <div className="panel-header">
            <h2 className="panel-title" id="organization-list">
              Available workspaces
            </h2>
          </div>
          <ul className="organization-list">
            {organizations.map((organization) => {
              const isActive = activeOrganizationId === organization.id;

              return (
                <li className="organization-list-item" key={organization.id}>
                  <div className="organization-list-copy">
                    <strong>{organization.name}</strong>
                    <span className="organization-list-slug">{organization.slug}</span>
                  </div>
                  <div className="organization-list-actions">
                    {isActive ? <span className="badge badge-success">Active</span> : null}
                    <form action={switchOrganizationAction}>
                      <input name="organizationId" type="hidden" value={organization.id} />
                      <button className="button-secondary" disabled={isActive} type="submit">
                        {isActive ? "Selected" : "Use workspace"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
