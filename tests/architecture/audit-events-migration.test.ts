import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260803200000_audit_events.sql",
);

describe("audit events migration", () => {
  it("defines append-only audit events with tenant RLS", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.audit_events");
    expect(sql).toContain("organization_id uuid not null");
    expect(sql).toContain("actor_type text not null");
    expect(sql).toContain("payload_redacted text not null");
    expect(sql).toContain("arise_prevent_audit_event_mutation");
    expect(sql).toContain("audit_events_prevent_update");
    expect(sql).toContain("audit_events_prevent_delete");
    expect(sql).toContain("grant select, insert on public.audit_events to arise_app");
    expect(sql).toContain("audit_events_tenant_isolation_select");
    expect(sql).toContain("audit_events_tenant_isolation_insert");
    expect(sql).not.toContain("grant update");
    expect(sql).not.toContain("grant delete");
  });
});
