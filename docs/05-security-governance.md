# Security and Governance

## Security baseline

- Deny by default.
- Least privilege for humans, services, agents and integrations.
- Secrets are brokered operations, not prompt values.
- Repository and model output are untrusted.
- Network egress is denied unless allowlisted.
- Every privileged action has policy evidence and audit evidence.

## Threats to test

- Cross-tenant retrieval
- Prompt injection in source code, issues, README files and test output
- Command injection through generated shell arguments
- Path traversal and symlink escapes
- SSRF and unapproved outbound hosts
- Secret leakage into prompts, logs, diffs, artifacts or model responses
- Malicious packages and post-install scripts
- Overbroad Supabase RLS policies
- Exposed service-role or Vercel credentials
- Unauthorized branch merge or production promotion
- Hallucinated success claims
- Resource exhaustion and infinite agent loops

## Decision rights

- Product owner approves scope and acceptance criteria.
- Architect approves structural exceptions.
- Security approver approves high-risk security exceptions.
- Platform admin controls integrations and production access.
- Client representative accepts delivered behavior.
- AI agents cannot approve their own work.

## Risk classes

### Green

Read-only operations; documentation; low-risk isolated code changes; additive nullable schema changes.

### Yellow

Authorization changes; dependency additions; non-null schema changes; RLS modifications; environment changes; backfills.

### Red

Production data deletion; disabling RLS; destructive migrations; credential exposure; production promotion; audit tampering.

Red actions require elevated human approval and may be entirely prohibited by organization policy.

## Secret handling

- Store encrypted secrets through a dedicated secret manager or platform facility.
- Persist only references such as `SECRET_REF:VERCEL_TEAM_TOKEN`.
- Redact known and detected secret patterns before storage and display.
- Rotate and revoke credentials.
- Test redaction against structured, encoded and multiline values.

## Incident controls

The platform must support suspend execution, revoke credentials, quarantine sandbox, freeze repository writes, preserve evidence, rollback deployment, declare incident and notify accountable roles.
