import { cookies } from "next/headers";

export const SESSION_COOKIES = {
  userId: "arise-user-id",
  organizationId: "arise-organization-id",
} as const;

export interface WorkspaceSession {
  userId: string;
  organizationId?: string;
}

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIES.userId)?.value ?? crypto.randomUUID();
  const organizationId = cookieStore.get(SESSION_COOKIES.organizationId)?.value;

  if (organizationId === undefined) {
    return { userId };
  }

  return { userId, organizationId };
}

export async function setWorkspaceSession(session: WorkspaceSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIES.userId, session.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  if (session.organizationId !== undefined) {
    cookieStore.set(SESSION_COOKIES.organizationId, session.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
}
