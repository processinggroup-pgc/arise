import Link from "next/link";

import { INITIATIVE_WIZARD_STEPS } from "@/lib/initiative-defaults";
import { listInitiativesForWorkspace } from "@/lib/initiative-queries";
import { getDashboardData } from "@/lib/queries";
import { listWorkspaceOrganizations } from "@/lib/workspace";

import { EnvironmentStatus } from "./environment-status";
import { OrganizationSwitcher } from "./organization-switcher";

interface AppShellProps {
  children: React.ReactNode;
  activePath: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/initiatives/new", label: "New Initiative" },
  { href: "/work-items", label: "Work Items" },
  { href: "/organizations", label: "Organizations" },
  { href: "/organizations/new", label: "Create Organization" },
];

export async function AppShell({
  children,
  activePath,
}: AppShellProps): Promise<React.JSX.Element> {
  const dashboard = await getDashboardData();
  const initiatives = await listInitiativesForWorkspace();
  const organizations = await listWorkspaceOrganizations();
  const hasOrganization = dashboard !== null;
  const needsOrganizationSelection = !hasOrganization && organizations.length > 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ARISE Studio</span>
          <p className="brand-title">Governed Build Agent</p>
          <p className="brand-subtitle">Assess · Recommend · Implement · Secure · Evaluate</p>
        </div>

        {!hasOrganization ? (
          <section className="sidebar-setup" aria-label="Workspace setup">
            <h2 className="sidebar-section-title">Get started</h2>
            {needsOrganizationSelection ? (
              <p className="sidebar-setup-note">
                You have organizations available. Choose one below to activate this workspace.
              </p>
            ) : (
              <ol className="sidebar-setup-list">
                <li>
                  <Link className="sidebar-setup-link" href="/organizations/new">
                    1. Create your organization
                  </Link>
                </li>
                <li>
                  <Link className="sidebar-setup-link" href="/initiatives/new">
                    2. Describe your problem
                  </Link>
                </li>
              </ol>
            )}
          </section>
        ) : null}

        <nav aria-label="Primary">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  className={`nav-link${activePath === item.href ? " active" : ""}`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="sidebar-workflow" aria-label="Product workflow">
          <h2 className="sidebar-section-title">Workflow</h2>
          <ol className="sidebar-workflow-list">
            {INITIATIVE_WIZARD_STEPS.map((step, index) => (
              <li key={step.id} className="sidebar-workflow-item">
                <span className="sidebar-workflow-index">{index + 1}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </section>

        {initiatives.length > 0 ? (
          <section className="sidebar-initiatives" aria-label="Your initiatives">
            <h2 className="sidebar-section-title">Initiatives</h2>
            <ul className="sidebar-initiative-list">
              {initiatives.map((initiative) => (
                <li key={initiative.id}>
                  <Link className="sidebar-initiative-link" href={`/initiatives/${initiative.id}`}>
                    {initiative.title}
                  </Link>
                  <span className="sidebar-initiative-state">
                    {initiative.state.replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="sidebar-footer">
          <OrganizationSwitcher
            {...(hasOrganization ? { activeOrganizationId: dashboard.organization.id } : {})}
          />
          <div className="sidebar-meta">
            <span className="sidebar-meta-label">Organization</span>
            <span className="sidebar-meta-value">
              {hasOrganization
                ? dashboard.organization.name
                : needsOrganizationSelection
                  ? "Choose a workspace"
                  : "Not set up yet"}
            </span>
          </div>
          <EnvironmentStatus />
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
