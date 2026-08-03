import { switchOrganizationAction } from "@/app/organizations/actions";
import { getWorkspaceSession } from "@/lib/session";
import { listWorkspaceOrganizations } from "@/lib/workspace";

interface OrganizationSwitcherProps {
  activeOrganizationId?: string | undefined;
}

export async function OrganizationSwitcher({
  activeOrganizationId,
}: OrganizationSwitcherProps): Promise<React.JSX.Element | null> {
  const session = await getWorkspaceSession();
  const organizations = await listWorkspaceOrganizations();

  if (organizations.length === 0) {
    return null;
  }

  const selectedOrganizationId = activeOrganizationId ?? session.organizationId ?? "";

  return (
    <form action={switchOrganizationAction} className="org-switcher">
      <label className="org-switcher-label" htmlFor="organizationId">
        Workspace
      </label>
      <div className="org-switcher-controls">
        <select
          className="org-switcher-select"
          defaultValue={selectedOrganizationId}
          id="organizationId"
          name="organizationId"
          required
        >
          {selectedOrganizationId.length === 0 ? (
            <option disabled value="">
              Choose organization
            </option>
          ) : null}
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <button className="org-switcher-button" type="submit">
          Switch
        </button>
      </div>
    </form>
  );
}
