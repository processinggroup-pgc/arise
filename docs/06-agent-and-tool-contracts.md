# Agent and Tool Contracts

## Agent rules

Every agent receives:

- one explicit role;
- a structured input contract;
- selected context with trust labels;
- an allowed-tool list;
- a maximum action and cost budget;
- a required output schema.

Agents may not change lifecycle state, approve work, reveal secrets or expand their tool permissions.

## Specialized agents

### Discovery Agent

Produces repository map and assessment evidence. No write tools.

### Architecture Agent

Produces options and decision record drafts. No repository writes.

### Coding Agent

Implements one approved task at a time. May edit files and run approved commands in a branch sandbox.

### Database Agent

Creates and validates migrations, RLS policies and generated types. No production database access.

### QA Agent

Creates tests from acceptance criteria independently of implementation details.

### Security Agent

Threat models and reviews evidence. No ability to waive findings.

### Reviewer Agent

Reviews diffs against requirements, constitution and quality standards.

## Tool action envelope

```json
{
  "action_id": "uuid",
  "tenant_id": "uuid",
  "work_item_id": "uuid",
  "agent_run_id": "uuid",
  "tool": "repository.write_file",
  "arguments": {},
  "purpose": "Implement task T-003",
  "expected_effect": "Update authorization guard",
  "risk_class": "yellow",
  "idempotency_key": "string"
}
```

Every action is validated, policy-evaluated, redacted, executed and evidenced.

## Minimum tools

- repository.read_file
- repository.search
- repository.write_file
- repository.diff
- git.create_branch
- git.commit
- test.run
- build.run
- migration.validate
- github.open_pull_request
- github.read_checks
- vercel.create_preview
- vercel.read_deployment
- supabase.create_preview_branch
- supabase.validate_schema

No generic unrestricted shell tool should be exposed to agents. Commands run through typed wrappers or a strict command policy.
