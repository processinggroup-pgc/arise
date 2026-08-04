export const WORKSPACE_ERROR_CODES = {
  invalidOrganization: "invalid_organization",
  membershipRequired: "membership_required",
  workspaceSetupFailed: "workspace_setup_failed",
} as const;

export type WorkspaceErrorCode =
  (typeof WORKSPACE_ERROR_CODES)[keyof typeof WORKSPACE_ERROR_CODES];

const WORKSPACE_ERROR_MESSAGES: Record<WorkspaceErrorCode, string> = {
  [WORKSPACE_ERROR_CODES.invalidOrganization]:
    "Choose a valid organization before switching workspaces.",
  [WORKSPACE_ERROR_CODES.membershipRequired]:
    "Your browser session does not have active membership for that organization.",
  [WORKSPACE_ERROR_CODES.workspaceSetupFailed]:
    "The organization was selected, but the default project could not be loaded. Check database migrations and membership, then try again.",
};

export function resolveWorkspaceErrorMessage(
  workspaceError: string | undefined,
): string | undefined {
  if (workspaceError === undefined || workspaceError.length === 0) {
    return undefined;
  }

  if (workspaceError in WORKSPACE_ERROR_MESSAGES) {
    return WORKSPACE_ERROR_MESSAGES[workspaceError as WorkspaceErrorCode];
  }

  return "Workspace activation failed. Try switching organizations again.";
}
