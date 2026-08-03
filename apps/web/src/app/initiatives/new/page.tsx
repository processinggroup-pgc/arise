import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/queries";

import { ProblemIntakeForm } from "./problem-intake-form";

export default async function NewInitiativePage(): Promise<React.JSX.Element> {
  const dashboard = await getDashboardData();
  if (dashboard === null) {
    redirect("/organizations/new");
  }

  return (
    <AppShell activePath="/initiatives/new" organizationName={dashboard.organization.name}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Start with the problem</h1>
          <p className="page-description">
            Describe the business problem first. ARISE will research how similar products and
            companies have solved it, then help you choose the framing that best fits your cohort
            affordability challenge.
          </p>
        </div>
        <Link className="button-link" href="/">
          Back to dashboard
        </Link>
      </header>

      <section className="panel detail-section">
        <ProblemIntakeForm />
      </section>
    </AppShell>
  );
}
