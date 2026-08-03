"use server";

import {
  OrganizationRegistrationError,
  createProjectForOrganization,
  registerOrganizationForApi,
} from "@arise/application";
import { createTenantContext } from "@arise/domain";
import { redirect } from "next/navigation";

import { getIdentityStore } from "@/lib/identity-store";
import { getProjectStore } from "@/lib/stores";
import { getWorkspaceSession, setWorkspaceSession } from "@/lib/session";

export interface CreateOrganizationFormState {
  error?: string;
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function createOrganizationAction(
  _previousState: CreateOrganizationFormState,
  formData: FormData,
): Promise<CreateOrganizationFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput.length > 0 ? normalizeSlug(slugInput) : normalizeSlug(name);
  const plan = String(formData.get("plan") ?? "starter").trim();
  const dataRegion = String(formData.get("dataRegion") ?? "us-east-1").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();

  const session = await getWorkspaceSession();

  try {
    const result = await registerOrganizationForApi(
      new Headers({
        "x-user-id": session.userId,
      }),
      {
        name,
        slug,
        plan,
        dataRegion,
        ...(ownerEmail.length > 0 ? { ownerEmail } : {}),
      },
      {
        identityStore: getIdentityStore(),
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
      },
    );

    const tenantContext = createTenantContext({
      organizationId: result.organization.id,
      userId: session.userId,
      correlationId: crypto.randomUUID(),
    });

    await createProjectForOrganization(
      {
        tenantContext,
        name: "Default Project",
        description: "Primary delivery workspace for governed agent runs.",
      },
      getProjectStore(),
      {
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
      },
    );

    await setWorkspaceSession({
      userId: session.userId,
      organizationId: result.organization.id,
    });
  } catch (error) {
    if (error instanceof OrganizationRegistrationError) {
      return { error: error.message };
    }

    return {
      error: error instanceof Error ? error.message : "Organization registration failed",
    };
  }

  redirect("/");
}
