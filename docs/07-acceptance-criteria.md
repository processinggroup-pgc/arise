# System Acceptance Criteria

## Intent

- Given a work item missing a target user, when readiness is evaluated, then implementation is blocked and the missing field is reported.
- Given approved acceptance criteria, when tests are generated, then each criterion receives a stable trace reference.
- Given a requirement changes after plan approval, when implementation resumes, then the plan is invalidated until reapproved.

## Governance

- Given a yellow action, when no required approver has approved it, then execution does not begin.
- Given a policy exception expires, when the related workflow runs, then the exception is no longer honored.
- Given an agent requests a blocked action, when policy evaluation completes, then no tool call is sent to the executor.

## Intelligence

- Given repository text containing malicious instructions, when context is assembled, then it is labeled untrusted and cannot alter policies or tool permissions.
- Given two tenants with similar repositories, when retrieval runs, then only the active tenant’s content is returned.
- Given a repository change, when indexing completes, then affected symbols and dependency relationships are updated idempotently.

## Execution

- Given a cancelled work item, when an execution session is running, then it is terminated and temporary credentials are revoked.
- Given a command outside the allowlist, when requested, then it is blocked and audited.
- Given a tool retry, when the first operation succeeded but the response was lost, then the idempotency key prevents duplication.

## Verification

- Given new business behavior, when a coding task starts, then a failing linked test exists first.
- Given a critical security finding, when release review begins, then release is blocked.
- Given an acceptance criterion without automated or approved manual evidence, when release evidence is produced, then coverage is incomplete.

## Delivery

- Given a pull request with failing required checks, when production promotion is requested, then promotion is blocked.
- Given a database-changing pull request, when preview is requested, then an isolated Supabase branch is used.
- Given a provider reports a failed deployment, when the agent claims success, then the platform records failure based on provider evidence.

## Operations

- Given budget exhaustion, when another model or sandbox action is requested, then execution pauses for approval.
- Given a declared incident, when containment begins, then all affected executions can be suspended and credentials revoked.
- Given a released work item, when the evaluation window closes, then outcome, cost, incidents and debt are recorded.
