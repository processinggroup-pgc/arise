"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runWithIdentityStore } from "@/lib/identity-bootstrap";
import { normalizeSessionId } from "@/lib/postgres-support";
import { getWorkspaceSession, setWorkspaceSession } from "@/lib/session";
import { WORKSPACE_ERROR_CODES } from "@/lib/workspace-errors";
import { resolveWorkspaceContext } from "@/lib/workspace";

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = normalizeSessionId(String(formData.get("organizationId") ?? "").trim());
  if (organizationId === undefined) {
    redirect(`/?workspaceError=${WORKSPACE_ERROR_CODES.invalidOrganization}`);
  }

  const session = await getWorkspaceSession();
  const membership = await runWithIdentityStore(session.userId, (store) =>
    store.findMembership(organizationId, session.userId),
  );

  if (membership === undefined || membership.status !== "active") {
    redirect(`/?workspaceError=${WORKSPACE_ERROR_CODES.membershipRequired}`);
  }

  await setWorkspaceSession({
    userId: session.userId,
    organizationId,
  });

  const workspace = await resolveWorkspaceContext();
  if (workspace === null) {
    redirect(`/?workspaceError=${WORKSPACE_ERROR_CODES.workspaceSetupFailed}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/organizations");
  redirect("/");
}
