# System Architecture

## 1. Architectural principles

- Deterministic controls outrank model judgment.
- The orchestrator authorizes; agents recommend; tools execute; verification proves.
- Every boundary uses typed contracts.
- Integrations are ports and adapters.
- All state-changing operations are idempotent.
- Tenant identity is required in every query and event.
- Repository content is untrusted.
- Production credentials are never mounted into routine sandboxes.

## 2. Logical components

### Web application

Provides projects, repositories, work items, approvals, code/diff views, tests, findings, previews and release evidence.

### API layer

Typed endpoints for user actions and read models. Performs authentication, authorization, validation and audit capture.

### Workflow orchestrator

Durable state machine for ARISE stages, jobs, approvals, retries, cancellation and compensation.

### Policy engine

Loads platform, organization and repository policies. Returns allowed, approval_required or blocked with reasons and evidence.

### Agent runtime

Runs specialized agents with explicit task contracts, selected context and tool allowlists.

### Repository intelligence service

Indexes repository structure, symbols, imports, routes, tests, schema, decisions and recent changes.

### Execution service

Creates ephemeral workspaces, enforces resource limits, executes tools and captures artifacts.

### Credential broker

Stores encrypted integration credentials and performs approved operations without revealing secret values to agents.

### Verification service

Coordinates unit, integration, contract, migration, architecture, security, accessibility and end-to-end checks.

### Delivery adapters

GitHub, Vercel and Supabase integrations behind stable interfaces.

### Operations service

Audit, telemetry, cost attribution, incidents, debt, retention and outcome evaluation.

## 3. Trust boundaries

1. Browser to application API
2. Application to orchestration workers
3. Orchestration to model providers
4. Orchestration to execution sandbox
5. Credential broker to third-party APIs
6. Tenant data boundary
7. Preview to production boundary

Each boundary must have authentication, authorization, validation, logging and failure tests.

## 4. Suggested repository layout

```text
apps/
  web/
  worker/
packages/
  domain/
  application/
  policy-engine/
  agent-runtime/
  repository-intelligence/
  execution-contracts/
  integration-github/
  integration-vercel/
  integration-supabase/
  verification/
  observability/
  test-support/
supabase/
  migrations/
  seed.sql
tests/
  acceptance/
  e2e/
  contract/
  security/
docs/
```

## 5. Domain boundaries

- Identity and tenancy
- Projects and repositories
- Intent and requirements
- Governance and approvals
- Agent runs and context
- Execution sessions
- Verification and findings
- Delivery and environments
- Operations and learning

Do not share database tables directly across packages. Domain/application services own behavior; repositories own persistence.

## 6. State machines

### Work item

Draft → Assessing → Not Ready | Ready for Recommendation → Recommendation Pending → Plan Approved → Implementing → Verifying → Preview Ready → Release Review → Released | Rejected | Cancelled

### Execution session

Requested → Provisioning → Ready → Running → Validating → Completed | Failed | Cancelled | Quarantined

### Finding

Open → Accepted Risk | In Remediation → Resolved | False Positive

### Approval

Pending → Approved | Rejected | Expired | Revoked

State transitions must be tested as pure domain functions before persistence or UI work.

## 7. Event model

Use immutable domain events, including:

- WorkItemCreated
- AssessmentCompleted
- ReadinessFailed
- RecommendationApproved
- ImplementationStarted
- ToolActionRequested
- PolicyDecisionRecorded
- TestRunCompleted
- FindingRaised
- PreviewProvisioned
- ReleaseApproved
- IncidentDeclared
- OutcomeEvaluated

Events must include tenant_id, actor, correlation_id, causation_id and timestamp.

## 8. Failure handling

- Retry only idempotent operations.
- Use bounded exponential backoff.
- Quarantine suspicious execution sessions.
- Compensate preview resources on cancellation.
- Persist partial evidence even after failure.
- Never report success solely from model output; success requires tool evidence.
