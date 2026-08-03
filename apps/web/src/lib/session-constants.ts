export const SESSION_COOKIES = {
  userId: "arise-user-id",
  organizationId: "arise-organization-id",
} as const;

export const SESSION_HEADERS = {
  userId: "x-arise-user-id",
} as const;

export function sessionCookieOptions(): {
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
