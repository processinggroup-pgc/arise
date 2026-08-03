import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIES, sessionCookieOptions } from "@/lib/session-constants";

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  if (request.cookies.get(SESSION_COOKIES.userId)?.value === undefined) {
    response.cookies.set(SESSION_COOKIES.userId, crypto.randomUUID(), sessionCookieOptions());
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
