import { cookies } from "next/headers";

import { SESSION_COOKIES, sessionCookieOptions } from "./session-constants";

export { SESSION_COOKIES } from "./session-constants";

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
