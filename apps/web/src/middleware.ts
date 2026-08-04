import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIES, SESSION_HEADERS, sessionCookieOptions } from "@/lib/session-constants";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSessionUserId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || !UUID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function middleware(request: NextRequest): NextResponse {
  const cookieUserId = normalizeSessionUserId(request.cookies.get(SESSION_COOKIES.userId)?.value);
  const userId = cookieUserId ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADERS.userId, userId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (cookieUserId === undefined) {
    response.cookies.set(SESSION_COOKIES.userId, userId, sessionCookieOptions());
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
