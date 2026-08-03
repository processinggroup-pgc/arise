# TDD and Test Strategy

## 1. Mandatory workflow

For every behavior:

1. Red — write a failing test that expresses the requirement.
2. Green — implement the smallest change that passes.
3. Refactor — improve design while preserving passing tests.
4. Evidence — link the test to its requirement or policy.

Codex must show the failing test before implementing behavior. Existing passing tests do not satisfy this rule for new behavior.

## 2. Test pyramid

### Unit tests

Pure domain rules, state transitions, risk scoring, policy decisions, parsers, redaction, traceability and cost calculations.

### Component tests

UI behavior, permission-aware rendering, forms, diff displays, approvals and evidence panels.

### Integration tests

Database repositories, queues, orchestration, index creation, sandbox adapters and credential-broker behavior.

### Contract tests

GitHub, Vercel, Supabase, model-provider and sandbox-provider adapters. Use recorded fixtures or local fakes; never rely only on live APIs.

### Migration tests

Fresh database, upgrade from prior schema, seeded data, rollback/compensation where supported, RLS and policy tests.

### Security tests

Tenant isolation, authorization, prompt injection, command injection, path traversal, SSRF, secret leakage, egress denial, malicious dependency and audit completeness.

### Architecture tests

Package boundaries, forbidden imports, direct database access, unauthorized integration usage and repository constitution compliance.

### Acceptance and end-to-end tests

Full user flows from work-item creation to approved preview and release evidence.

## 3. Required acceptance scenarios

- A ready work item can progress through assessment, recommendation and plan approval.
- A not-ready work item is blocked with actionable missing fields.
- A low-risk branch change can be implemented and verified without production access.
- A destructive migration requires elevated approval and cannot run automatically.
- A policy violation blocks the tool action even when an agent requests it.
- Repository prompt injection cannot modify tool permissions.
- A tenant cannot retrieve another tenant’s repository, context, logs or artifacts.
- A failed external API operation is retried safely and does not duplicate resources.
- Preview deployment success requires provider evidence, not an agent claim.
- Release evidence maps every acceptance criterion to passing automated evidence or an explicit approved manual result.

## 4. Quality gates

Required on every pull request:

```text
format
lint
strict typecheck
unit tests
component tests
integration tests
contract tests for changed adapters
migration tests for schema changes
security tests
architecture tests
build
acceptance tests for changed user journeys
```

## 5. Coverage policy

- Domain and policy packages: 95% branch coverage minimum.
- Security-critical paths: 100% decision-branch coverage.
- Other packages: 85% branch coverage minimum.
- Coverage is a floor, not proof of correctness.
- Mutation testing should be introduced for policy and authorization packages by milestone 4.

## 6. Test naming

Use behavior statements:

`it('blocks implementation when data classification is missing')`

Avoid implementation-detail names.

## 7. Test data

- Use builders and factories.
- Make tenant identity explicit.
- Generate malicious and boundary inputs.
- Never place real secrets or customer data in fixtures.
- All time-dependent behavior uses an injected clock.
- All random behavior uses an injected deterministic source.

## 8. Flaky-test policy

A flaky test is a defect. Quarantine requires a tracked debt item, owner and expiration. Required security and authorization tests may never be ignored.
