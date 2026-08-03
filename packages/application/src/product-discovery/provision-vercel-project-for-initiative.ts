import type { PlatformConnections, TechStack } from "@arise/domain";
import type { VercelProjectPort } from "@arise/integration-vercel";

import { readProcessEnv, resolveEnvRef } from "./resolve-env-ref.js";
import { InitiativeWorkflowError } from "./run-market-research-for-initiative.js";

export interface ProvisionVercelProjectInput {
  initiativeId: string;
  initiativeTitle: string;
  platformConnections: PlatformConnections;
  techStack?: TechStack | undefined;
}

export interface ProvisionVercelProjectResult {
  platformConnections: PlatformConnections;
  projectId: string;
  projectName: string;
  projectUrl: string;
}

function slugifyProjectName(title: string, initiativeId: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const suffix = initiativeId.slice(0, 6);
  return slug.length > 0 ? `${slug}-${suffix}` : `arise-mvp-${initiativeId.slice(0, 8)}`;
}

function mapFramework(techStack?: TechStack): string | undefined {
  const frontend = techStack?.frontend.toLowerCase() ?? "";
  if (frontend.includes("next")) {
    return "nextjs";
  }
  if (frontend.includes("nuxt")) {
    return "nuxtjs";
  }
  if (frontend.includes("svelte")) {
    return "sveltekit";
  }
  if (frontend.includes("remix")) {
    return "remix";
  }

  return "nextjs";
}

function shouldProvisionProject(projectId: string): boolean {
  return projectId.length === 0 || projectId.startsWith("pending-");
}

function buildResendEnvironmentVariables(): Array<{
  key: string;
  value: string;
  target: Array<"production" | "preview" | "development">;
}> {
  const resendApiKey = readProcessEnv(["RESEND_API_KEY"]);
  const resendFromEmail = readProcessEnv(["RESEND_FROM_EMAIL", "EMAIL_FROM"]);
  if (resendApiKey === undefined || resendFromEmail === undefined) {
    return [];
  }

  return [
    {
      key: "RESEND_API_KEY",
      value: resendApiKey,
      target: ["production", "preview", "development"],
    },
    {
      key: "RESEND_FROM_EMAIL",
      value: resendFromEmail,
      target: ["production", "preview", "development"],
    },
  ];
}

function resolveGitRepository():
  | {
      type: "github";
      repo: string;
    }
  | undefined {
  const repo = readProcessEnv(["VERCEL_GIT_REPO", "GITHUB_REPOSITORY"]);
  if (repo === undefined) {
    return undefined;
  }

  return { type: "github", repo };
}

export async function provisionVercelProjectForInitiative(
  input: ProvisionVercelProjectInput,
  vercelProjectPort: VercelProjectPort,
): Promise<ProvisionVercelProjectResult | undefined> {
  const { vercel } = input.platformConnections;
  if (vercel.status === "pending") {
    throw new InitiativeWorkflowError("Vercel must be connected before provisioning a project");
  }

  if (!shouldProvisionProject(vercel.projectId)) {
    return undefined;
  }

  const token = resolveEnvRef(vercel.tokenRef);
  const teamId = resolveEnvRef(vercel.teamId);
  if (token.length === 0 || teamId.length === 0) {
    throw new InitiativeWorkflowError(
      "Vercel token and team ID must be available to provision a project via the Vercel API",
    );
  }

  await vercelProjectPort.validateCredentials({ teamId });

  const projectName = slugifyProjectName(input.initiativeTitle, input.initiativeId);
  const gitRepository = resolveGitRepository();
  const framework = mapFramework(input.techStack);
  const rootDirectory = readProcessEnv(["VERCEL_ROOT_DIRECTORY"]);
  const created = await vercelProjectPort.createProject({
    name: projectName,
    ...(framework !== undefined ? { framework } : {}),
    ...(rootDirectory !== undefined ? { rootDirectory } : {}),
    ...(gitRepository !== undefined ? { gitRepository } : {}),
    environmentVariables: buildResendEnvironmentVariables(),
  });

  return {
    projectId: created.projectId,
    projectName: created.projectName,
    projectUrl: created.projectUrl,
    platformConnections: {
      ...input.platformConnections,
      vercel: {
        ...vercel,
        projectId: created.projectId,
      },
    },
  };
}

export function buildSupabaseIntegrationUrl(projectName: string): string {
  return `https://vercel.com/dashboard/${encodeURIComponent(projectName)}/integrations/supabase`;
}
