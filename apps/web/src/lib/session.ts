import { cookies } from "next/headers";

export const SESSION_COOKIES = {
  userId: "arise-user-id",
  organizationId: "arise-organization-id",
} as const;

export interface WorkspaceSession {
  userId: string;
  organizationId?: string;
}

function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure?: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...(process.env["NODE_ENV"] === "production" ? { secure: true } : {}),
  };
}

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const cookieStore = await cookies();
  const cookieOptions = sessionCookieOptions();
  let userId = cookieStore.get(SESSION_COOKIES.userId)?.value;

  if (userId === undefined) {
    userId = crypto.randomUUID();
    cookieStore.set(SESSION_COOKIES.userId, userId, cookieOptions);
  }

  const organizationId = cookieStore.get(SESSION_COOKIES.organizationId)?.value;

  if (organizationId === undefined) {
    return { userId };
  }

  return { userId, organizationId };
}

export async function setWorkspaceSession(session: WorkspaceSession): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = sessionCookieOptions();

  cookieStore.set(SESSION_COOKIES.userId, session.userId, cookieOptions);

  if (session.organizationId !== undefined) {
    cookieStore.set(SESSION_COOKIES.organizationId, session.organizationId, cookieOptions);
  }
}

export async function clearOrganizationSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIES.organizationId);
}
