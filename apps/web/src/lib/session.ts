import { cookies, headers } from "next/headers";

import { normalizeSessionId } from "./postgres-support";
import { SESSION_COOKIES, SESSION_HEADERS, sessionCookieOptions } from "./session-constants";

export { SESSION_COOKIES } from "./session-constants";

export interface WorkspaceSession {
  userId: string;
  organizationId?: string;
}

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const userId =
    normalizeSessionId(cookieStore.get(SESSION_COOKIES.userId)?.value) ??
    normalizeSessionId(headerStore.get(SESSION_HEADERS.userId) ?? undefined) ??
    crypto.randomUUID();
  const organizationId = normalizeSessionId(cookieStore.get(SESSION_COOKIES.organizationId)?.value);

  if (organizationId === undefined) {
    return { userId };
  }

  return { userId, organizationId };
}

export async function setWorkspaceSession(session: WorkspaceSession): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = sessionCookieOptions();
  const userId = normalizeSessionId(session.userId) ?? crypto.randomUUID();
  const organizationId = normalizeSessionId(session.organizationId);

  cookieStore.set(SESSION_COOKIES.userId, userId, cookieOptions);

  if (organizationId !== undefined) {
    cookieStore.set(SESSION_COOKIES.organizationId, organizationId, cookieOptions);
  }
}

export async function clearOrganizationSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIES.organizationId);
}
