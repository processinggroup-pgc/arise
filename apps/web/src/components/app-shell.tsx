import Link from "next/link";

import { EnvironmentStatus } from "./environment-status";

interface AppShellProps {
  children: React.ReactNode;
  organizationName: string;
  activePath: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/initiatives/new", label: "New Initiative" },
  { href: "/work-items", label: "Work Items" },
  { href: "/organizations/new", label: "Create Organization" },
];

export function AppShell({
  children,
  organizationName,
  activePath,
}: AppShellProps): React.JSX.Element {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ARISE Studio</span>
          <h1 className="brand-title">Governed Build Agent</h1>
          <p className="brand-subtitle">Assess · Recommend · Implement · Secure · Evaluate</p>
        </div>

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

        <div className="sidebar-footer">
          <div className="sidebar-meta">
            <span className="sidebar-meta-label">Organization</span>
            <span className="sidebar-meta-value">{organizationName}</span>
          </div>
          <EnvironmentStatus />
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
