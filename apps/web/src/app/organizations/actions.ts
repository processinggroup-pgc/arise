"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runWithIdentityStore } from "@/lib/identity-bootstrap";
import { getWorkspaceSession, setWorkspaceSession } from "@/lib/session";

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (organizationId.length === 0) {
    return;
  }

  const session = await getWorkspaceSession();
  const membership = await runWithIdentityStore(session.userId, (store) =>
    store.findMembership(organizationId, session.userId),
  );

  if (membership === undefined || membership.status !== "active") {
    return;
  }

  await setWorkspaceSession({
    userId: session.userId,
    organizationId,
  });

  revalidatePath("/", "layout");
  redirect("/");
}
