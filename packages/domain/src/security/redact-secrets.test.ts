import { describe, expect, it } from "vitest";

import { redactSecrets } from "./redact-secrets.js";

describe("redactSecrets", () => {
  it("redacts GitHub personal access tokens", () => {
    const input = "token=ghp_abcdefghijklmnopqrstuvwxyz1234567890";

    expect(redactSecrets(input)).toBe("token=[REDACTED]");
  });

  it("redacts bearer tokens and multiline private keys", () => {
    const input = [
      "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
      "-----BEGIN PRIVATE KEY-----",
      "line-1",
      "-----END PRIVATE KEY-----",
    ].join("\n");

    const output = redactSecrets(input);

    expect(output).toContain("Authorization: Bearer [REDACTED]");
    expect(output).not.toContain("line-1");
    expect(output).toContain("[REDACTED]");
  });

  it("preserves secret references", () => {
    const input = "credential=SECRET_REF:VERCEL_TEAM_TOKEN";

    expect(redactSecrets(input)).toBe(input);
  });

  it("redacts structured key-value secrets", () => {
    const input = '{"api_key":"super-secret-value"} api_key=super-secret-value';

    expect(redactSecrets(input)).not.toContain("super-secret-value");
    expect(redactSecrets(input)).toContain("[REDACTED]");
  });
});
