import Link from "next/link";

import { switchOrganizationAction } from "@/app/organizations/actions";
import { AppShell } from "@/components/app-shell";
import { hasDatabaseUrl } from "@/lib/database";
import { getWorkspaceSession } from "@/lib/session";
import { listWorkspaceOrganizations, resolveWorkspaceContext } from "@/lib/workspace";

export default async function OrganizationsPage(): Promise<React.JSX.Element> {
  const session = await getWorkspaceSession();
  const workspace = await resolveWorkspaceContext();
  const organizations = await listWorkspaceOrganizations();
  const activeOrganizationId = workspace?.organizationId;
  const databaseConnected = hasDatabaseUrl();

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
          {databaseConnected ? (
            <p>
              Database-backed mode is active. Organizations only appear here when your browser
              session user ID has an active membership row in <code>organization_memberships</code>.
            </p>
          ) : (
            <p>
              The app is running in in-memory mode because <code>DATABASE_URL</code> is not
              configured. Created organizations will not appear in Supabase until that variable is
              set on Vercel.
            </p>
          )}
          <p className="session-user-id">
            Session user ID: <code>{session.userId}</code>
          </p>
          <p>Create an organization or add a membership for this user ID in your database seed.</p>
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
