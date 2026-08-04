"use server";

import {
  OrganizationRegistrationError,
  createProjectForOrganization,
  registerOrganizationForApi,
  supportsBootstrapDefaultProject,
} from "@arise/application";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runWithIdentityStore } from "@/lib/identity-bootstrap";
import { getProjectStore } from "@/lib/stores";
import { getWorkspaceSession, setWorkspaceSession } from "@/lib/session";

export interface CreateOrganizationFormState {
  error?: string;
}

const DEFAULT_PROJECT_NAME = "Default Project";
const DEFAULT_PROJECT_DESCRIPTION = "Primary delivery workspace for governed agent runs.";

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
    let createdDefaultProject = false;

    const result = await runWithIdentityStore(session.userId, async (identityStore) => {
      const registration = await registerOrganizationForApi(
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
          identityStore,
          createId: () => crypto.randomUUID(),
          now: () => new Date(),
        },
      );

      if (supportsBootstrapDefaultProject(identityStore)) {
        await identityStore.bootstrapDefaultProject({
          organizationId: registration.organization.id,
          projectId: crypto.randomUUID(),
          name: DEFAULT_PROJECT_NAME,
          description: DEFAULT_PROJECT_DESCRIPTION,
          createdAt: new Date(),
        });
        createdDefaultProject = true;
      }

      return registration;
    });

    if (!createdDefaultProject) {
      await createProjectForOrganization(
        {
          tenantContext: {
            organizationId: result.organization.id,
            userId: session.userId,
            correlationId: crypto.randomUUID(),
          },
          name: DEFAULT_PROJECT_NAME,
          description: DEFAULT_PROJECT_DESCRIPTION,
        },
        getProjectStore(),
        {
          createId: () => crypto.randomUUID(),
          now: () => new Date(),
        },
      );
    }

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

  revalidatePath("/", "layout");
  revalidatePath("/organizations");
  redirect("/");
}
