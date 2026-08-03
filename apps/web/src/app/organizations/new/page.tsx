import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getWorkspaceSession } from "@/lib/session";

import { CreateOrganizationForm } from "./create-organization-form";

export default async function CreateOrganizationPage(): Promise<React.JSX.Element> {
  const session = await getWorkspaceSession();

  return (
    <AppShell activePath="/organizations/new">
      <header className="page-header">
        <div>
          <h1 className="page-title">Create organization</h1>
          <p className="page-description">
            Register a governed ARISE workspace. You will become the founding owner and receive a
            default delivery project.
          </p>
        </div>
        {session.organizationId !== undefined ? (
          <Link className="button-link" href="/">
            Back to dashboard
          </Link>
        ) : null}
      </header>

      <section className="panel detail-section">
        <CreateOrganizationForm />
      </section>
    </AppShell>
  );
}
