import { resolveWorkspaceErrorMessage } from "@/lib/workspace-errors";

interface WorkspaceErrorBannerProps {
  workspaceError?: string | undefined;
}

export function WorkspaceErrorBanner({
  workspaceError,
}: WorkspaceErrorBannerProps): React.JSX.Element | null {
  const message = resolveWorkspaceErrorMessage(workspaceError);

  if (message === undefined) {
    return null;
  }

  return (
    <div className="workspace-error-banner" role="alert">
      <strong>Workspace activation failed.</strong> {message}
    </div>
  );
}
