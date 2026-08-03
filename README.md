# ARISE Studio — Codex Build Package

ARISE Studio is a governed AI software-delivery platform that converts approved business intent into tested, reviewed, traceable code and preview deployments.

This package is authoritative for the initial build. Codex should implement the system incrementally, test-first, and avoid expanding scope beyond the defined release gates.

## Product promise

Turn an approved change request into a secure, tested pull request and isolated preview environment while preserving traceability from business requirement to deployment evidence.

## Seven product layers

1. Intent — problems, users, outcomes, requirements, acceptance criteria.
2. Governance — ARISE lifecycle, policies, approvals, decision rights.
3. Intelligence — repository understanding, retrieval, planning, specialized agents.
4. Execution — sandboxes, tools, branches, code and migrations.
5. Verification — TDD, tests, security, quality, architecture checks.
6. Delivery — GitHub, Supabase, Vercel, previews and release controls.
7. Operations — monitoring, incidents, cost, support, learning and evolution.

## Required build discipline

- TDD is mandatory: red, green, refactor.
- No feature is complete without automated evidence.
- Every externally visible behavior must have an acceptance test.
- Every policy decision must be deterministic and unit tested.
- Every integration must have contract tests and failure-path tests.
- Production actions require explicit human approval.
- Generated code never receives raw secrets.
- Repository content is untrusted input.

## Recommended stack

- Next.js App Router, React, TypeScript strict mode
- Supabase Auth, Postgres, Storage and Realtime
- Durable background jobs using a queue abstraction
- Monaco Editor for code/diff views
- GitHub App for repository access
- Vercel and Supabase adapters behind credential broker interfaces
- Ephemeral isolated execution workers
- Vitest for unit/integration tests
- Playwright for end-to-end and acceptance tests
- Testcontainers or isolated local services for database/integration testing

## Start here

1. Read `docs/01-product-requirements.md`.
2. Read `docs/02-system-architecture.md`.
3. Follow `docs/08-codex-execution-plan.md` exactly.
4. Implement milestone zero before any integration work.
5. Run the repository quality command before every commit.

## Global definition of done

A work item is done only when:

- acceptance criteria are linked to passing tests;
- required policies pass;
- security and architecture checks pass;
- documentation and decision records are updated;
- migrations have forward and rollback validation;
- operational readiness is defined;
- a release-evidence record is produced;
- no unresolved critical or high findings remain.
