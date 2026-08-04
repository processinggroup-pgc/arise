import { switchOrganizationAction } from "@/app/organizations/actions";
import { getWorkspaceSession } from "@/lib/session";
import { listWorkspaceOrganizations } from "@/lib/workspace";

interface OrganizationSwitcherProps {
  activeOrganizationId?: string | undefined;
  selectId?: string;
}

export async function OrganizationSwitcher({
  activeOrganizationId,
  selectId = "organizationId",
}: OrganizationSwitcherProps): Promise<React.JSX.Element | null> {
  const session = await getWorkspaceSession();
  const organizations = await listWorkspaceOrganizations();

  if (organizations.length === 0) {
    return null;
  }

  const onlyOrganizationId = organizations.length === 1 ? organizations[0]?.id : undefined;
  const selectedOrganizationId =
    activeOrganizationId ?? session.organizationId ?? onlyOrganizationId ?? "";

  return (
    <form action={switchOrganizationAction} className="org-switcher">
      <label className="org-switcher-label" htmlFor={selectId}>
        Workspace
      </label>
      <div className="org-switcher-controls">
        <select
          className="org-switcher-select"
          defaultValue={selectedOrganizationId}
          id={selectId}
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
