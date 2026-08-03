# Data Model

## Core entities

### organizations

id, name, slug, plan, data_region, created_at

### users and memberships

users; organization_memberships with role and status

### projects

organization_id, name, description, status, settings

### repositories

project_id, provider, external_id, default_branch, installation_id, status

### arise_work_items

project_id, title, type, state, risk_level, owner_id, version

### requirements

work_item_id, kind, statement, priority, source, status

### acceptance_criteria

requirement_id, given_text, when_text, then_text, automated_test_ref

### assessments

work_item_id, content_json, readiness_result, model_run_id, approved_by

### recommendations

work_item_id, preferred_option_json, alternatives_json, decision_status

### implementation_plans

work_item_id, branch_name, plan_json, status, approved_by

### implementation_tasks

plan_id, sequence, description, files_json, acceptance_refs, status

### approvals

organization_id, subject_type, subject_id, approval_type, requested_from, status, expires_at

### policy_sets and policy_rules

scope_type, scope_id, version, rule_key, severity, condition_json, action

### policy_evaluations

rule_id, subject_type, subject_id, decision, reasons_json, evidence_json

### exceptions

policy_rule_id, subject, justification, owner, expires_at, status

### agent_runs

organization_id, work_item_id, agent_type, model_provider, model_name, model_version, status, token_usage, cost

### context_items

agent_run_id, source_type, source_ref, trust_level, content_hash, rank

### tool_calls

agent_run_id, tool_name, arguments_redacted, decision_id, status, evidence_ref

### execution_sessions

work_item_id, repository_id, sandbox_provider, state, limits_json, branch, started_at, ended_at

### test_runs

execution_session_id, category, command, status, counts_json, duration_ms, artifact_ref

### findings

work_item_id, category, severity, title, evidence, remediation, status

### pull_requests and deployments

repository_id, external_id, url_ref, status; deployments with provider, environment, preview_ref, status

### migrations

work_item_id, file_path, checksum, risk_level, forward_status, rollback_status

### release_evidence

work_item_id, version, requirement_coverage, tests_json, policies_json, findings_json, approvals_json

### incidents

organization_id, severity, status, summary, timeline_json, containment_json

### technical_debt

project_id, source_work_item_id, description, risk, owner, due_date, status

### audit_events

organization_id, actor_type, actor_id, event_type, subject, correlation_id, payload_redacted, created_at

## Required database controls

- Every tenant-owned table contains organization_id directly or has an enforceable tenant path.
- Row Level Security is enabled on all tenant tables.
- Service operations set tenant context explicitly.
- Unique constraints protect idempotency keys.
- Audit events are append-only.
- Soft deletion is used where legal/audit needs require retention.
- Retention and deletion jobs are testable.
