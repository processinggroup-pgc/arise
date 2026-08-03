# Codex Execution Plan

## Operating instruction

Build one milestone at a time. Do not scaffold later milestones prematurely. At the start of each story, create failing tests. At completion, update traceability and architecture decisions.

## Milestone 0 — Repository foundation

Deliver:

- monorepo layout;
- strict TypeScript configuration;
- formatting, linting and dependency rules;
- Vitest, Playwright and test-support package;
- CI workflow running all current gates;
- architecture boundary tests;
- environment validation and secret redaction utility;
- contribution and ADR templates.

Exit gate: one command runs format check, lint, typecheck, unit tests, architecture tests and build.

## Milestone 1 — Identity, tenancy and audit

Deliver:

- organizations, users, memberships and roles;
- tenant-aware request context;
- RLS and isolation tests;
- append-only audit events;
- authorization policy primitives;
- basic application shell.

Exit gate: automated tests prove cross-tenant access is blocked at API and database layers.

## Milestone 2 — Intent and governance

Deliver:

- work items, requirements, acceptance criteria and versioning;
- ARISE state machine;
- readiness evaluator;
- approvals and policy engine;
- exception register;
- traceability model and UI.

Exit gate: acceptance tests prove ready/not-ready paths and approval enforcement.

## Milestone 3 — Repository intelligence

Deliver:

- GitHub App connection interface and fake adapter first;
- repository ingestion;
- file/symbol/dependency map;
- context retrieval with trust labels;
- constitution import and validation;
- prompt-injection defenses.

Exit gate: indexed repository answers are tenant-safe, reproducible and show context provenance.

## Milestone 4 — Agent runtime

Deliver:

- model registry;
- structured agent-run contracts;
- Discovery and Architecture agents;
- tool registry and budgets;
- durable orchestration;
- run inspection and cancellation.

Exit gate: agents can assess and recommend without write access, and all outputs validate against schemas.

## Milestone 5 — Controlled execution

Deliver:

- sandbox interface and fake provider;
- branch workspace lifecycle;
- typed read/write/diff/test/build tools;
- Coding and QA agents;
- action policy evaluation;
- execution artifacts and evidence.

Exit gate: an approved story is implemented on an isolated branch using red-green-refactor and cannot access production secrets.

## Milestone 6 — Verification platform

Deliver:

- Security and Reviewer agents;
- finding workflow;
- unit/component/integration/contract/security/architecture test orchestration;
- migration validator;
- release-evidence generator;
- mutation testing for policy and authorization.

Exit gate: a deliberately vulnerable sample change is blocked with evidence.

## Milestone 7 — Delivery integrations

Deliver in this order:

1. GitHub pull requests and checks
2. Vercel preview adapter
3. Supabase preview branch and migration adapter
4. environment requirement comparison
5. release approval and production boundary

Write fake and contract tests before live integration tests.

Exit gate: a sample app change produces a PR, Vercel preview, Supabase preview when required and complete release evidence.

## Milestone 8 — Operations and evolution

Deliver:

- telemetry and cost attribution;
- budgets and pause controls;
- incidents and containment actions;
- technical debt and support ownership;
- outcome evaluation;
- policy/pattern recommendations requiring human approval.

Exit gate: a simulated incident suspends execution, revokes temporary access and preserves an auditable timeline.

## Story implementation template

1. Link story to requirement and acceptance criteria.
2. Write failing unit or acceptance test.
3. Implement minimum behavior.
4. Refactor behind passing tests.
5. Add negative, boundary and security cases.
6. Update API/schema documentation.
7. Run full affected quality gates.
8. Record evidence and ADR if architecture changed.

## Codex stopping conditions

Stop and report rather than guessing when:

- a requirement conflicts with an approved policy;
- production access is required;
- a destructive migration has no approval;
- acceptance criteria are contradictory;
- a secret appears in source or output;
- a security-critical test cannot be made deterministic.
