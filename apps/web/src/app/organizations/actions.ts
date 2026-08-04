"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runWithIdentityStore } from "@/lib/identity-bootstrap";
import { normalizeSessionId } from "@/lib/postgres-support";
import { getWorkspaceSession, setWorkspaceSession } from "@/lib/session";

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = normalizeSessionId(String(formData.get("organizationId") ?? "").trim());
  if (organizationId === undefined) {
    redirect("/?workspaceError=invalid_organization");
  }

  const session = await getWorkspaceSession();
  const membership = await runWithIdentityStore(session.userId, (store) =>
    store.findMembership(organizationId, session.userId),
  );

  if (membership === undefined || membership.status !== "active") {
    redirect("/?workspaceError=membership_required");
  }

  await setWorkspaceSession({
    userId: session.userId,
    organizationId,
  });

  revalidatePath("/", "layout");
  revalidatePath("/organizations");
  redirect("/");
}
