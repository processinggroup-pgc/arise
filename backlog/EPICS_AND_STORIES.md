# Epics and Initial Stories

## E0 Foundation

- E0-S1 Create strict monorepo and quality command.
- E0-S2 Add CI and architecture-boundary tests.
- E0-S3 Add environment validation and secret redaction.

## E1 Identity and tenancy

- E1-S1 Create organizations and memberships.
- E1-S2 Enforce API tenant context.
- E1-S3 Enforce database RLS isolation.
- E1-S4 Record immutable audit events.

## E2 Intent and governance

- E2-S1 Create versioned work items.
- E2-S2 Create requirements and GWT acceptance criteria.
- E2-S3 Implement ARISE state machine.
- E2-S4 Implement readiness evaluation.
- E2-S5 Implement approvals and policy decisions.
- E2-S6 Implement traceability graph.

## E3 Repository intelligence

- E3-S1 Connect repository through fake GitHub adapter.
- E3-S2 Index files and symbols.
- E3-S3 Build dependency and test maps.
- E3-S4 Retrieve tenant-safe context with provenance.
- E3-S5 Detect repository prompt injection.

## E4 Agent runtime

- E4-S1 Create model registry and run contracts.
- E4-S2 Implement Discovery Agent.
- E4-S3 Implement Architecture Agent.
- E4-S4 Enforce tool allowlists and budgets.
- E4-S5 Cancel and resume durable runs.

## E5 Execution

- E5-S1 Provision fake ephemeral sandbox.
- E5-S2 Create typed repository and git tools.
- E5-S3 Implement Coding Agent one task at a time.
- E5-S4 Implement independent QA Agent.
- E5-S5 Capture diffs, commits and execution evidence.

## E6 Verification

- E6-S1 Orchestrate all test categories.
- E6-S2 Implement finding lifecycle.
- E6-S3 Implement Security Agent.
- E6-S4 Implement Reviewer Agent.
- E6-S5 Generate release evidence.
- E6-S6 Mutation-test policy and authorization rules.

## E7 Delivery

- E7-S1 Create GitHub PR and checks adapter.
- E7-S2 Create Vercel preview adapter.
- E7-S3 Create Supabase branch and migration adapter.
- E7-S4 Compare environment requirements safely.
- E7-S5 Enforce production approval boundary.

## E8 Operations

- E8-S1 Attribute model, build and sandbox cost.
- E8-S2 Pause on budget thresholds.
- E8-S3 Declare and contain incidents.
- E8-S4 Track technical debt and support ownership.
- E8-S5 Evaluate outcomes and propose governed improvements.

## E9 Product discovery

- E9-S1 Capture initiative problem briefs.
- E9-S2 Generate market research dossiers and framing options.
- E9-S3 Align on the preferred problem framing.

## E10 BRD and solutions

- E10-S1 Generate BRD drafts from aligned research.
- E10-S2 Propose three product solution options.
- E10-S3 Finalize BRD and MVP backlog.

## E11 Cohort curriculum alignment

Maps ARISE Studio initiative flow to cohort weeks 1–3. User posts each week's curriculum to verify coverage.

### Week 1 — Problem clarity, ICP, and AI stress-test

**Cohort outcomes:** sharp problem statement, defined ICP, idea stress-tested by two AI tools, top 3 risks identified.

| Cohort deliverable | ARISE coverage | Status |
| --- | --- | --- |
| One-sentence problem (pre-work) | Problem brief `rawProblemDescription` | Built |
| Rough audience / ICP draft | Problem brief + rich ICP fields | Built |
| Prompt 1 — idea refinement (ChatGPT + Claude) | Market research + dual-AI comparison | Built |
| Prompt 2 — aggressive stress test | Stress test artifact | Built |
| Prompt 3 — finalize concept (problem, customer, solution, why now, risks) | Finalize concept form + business concept | Built |
| Session notes (pain, ICP, AI insights, risks) | Session notes Week 1 | Built |
| Week 1 homework one-pager export | Markdown export `/export/1` | Built |
| Working agreement acknowledgment | — | Out of product (Skool) |
| Artifact storage link | — | Out of product (Notion/Drive) |

**Stories**

- E11-W1-S1 Rich ICP capture (persona fields beyond single `targetAudience` line).
- E11-W1-S2 Dual-AI validation run (same prompt in Claude + second provider; side-by-side diff).
- E11-W1-S3 Stress-test pass (Prompt 2: failure modes, non-users, wrong assumptions).
- E11-W1-S4 Finalize business concept artifact (problem, customer, solution, why now, top 3 risks).
- E11-W1-S5 Session notes form tied to initiative.
- E11-W1-S6 Export Week 1 homework document (Markdown/PDF one-pager).

### Week 2 — Business case, MVP definition, and revenue hypothesis

**Cohort outcomes:** clear business model (customer + problem + value + revenue), tightly scoped MVP (1–2 features), explicit "what NOT to build" list, revenue hypothesis and pricing starting point.

**Pre-work:** review Week 1 problem/ICP; list 5 wished-for features (most get cut in session).

| Cohort deliverable | ARISE coverage | Status |
| --- | --- | --- |
| Week 1 review (problem + ICP) | Problem brief + alignment on initiative | Built |
| Pre-work: 5 feature wish list | MVP scope wish-list form | Built |
| Prompt 1 — business model (ICP, pain, value, revenue options, acquisition, risks) | Business case generator | Built |
| Prompt 2 — MVP scoping (1–2 features, NOT build, user flow, fastest value) | MVP scope generator | Built |
| Prompt 3 — MVP stress test (cut unnecessary/overbuilt) | MVP stress test on finalize | Built |
| Prompt 4 — revenue model recommendation | Revenue hypothesis form | Built |
| Session notes (outcome, in/out scope, revenue, pricing, killer assumption) | Session notes Week 2 | Built |
| Homework: final business case | Export `/export/2` | Built |
| Homework: final MVP definition + NOT build list | Export `/export/2` | Built |
| Homework: 30% reduction simplicity check | Simplicity check on MVP finalize | Built |

**Note:** Original E10-S2 ("three product solution options") is broader than cohort Week 2, which forces **1–2 MVP features** and an explicit defer list. Week 2 wizard steps should prioritize constraint over option breadth.

**Maps to initiative wizard:** `brd` → Business case · `solutions` → MVP scoping · `mvp` → MVP finalize (states: `brd_draft`, `solution_selected`, `mvp_finalized`).

**Stories**

- E11-W2-S1 Business case artifact (ICP, problem, value proposition, revenue model options, acquisition strategy, risks) — extends E10-S1.
- E11-W2-S2 Feature wish-list intake (pre-work: 5 features before scoping session).
- E11-W2-S3 MVP scope artifact (1–2 core features, user flow, fastest path to value) — extends E10-S3.
- E11-W2-S4 "What NOT to build" list (explicit out-of-scope/defer items with rationale).
- E11-W2-S5 Revenue hypothesis capture (chosen model + pricing starting point + killer assumption).
- E11-W2-S6 MVP stress-test pass (Prompt 3: unnecessary, removable, overbuilt).
- E11-W2-S7 30% reduction simplicity check (Prompt on MVP definition; store AI output).
- E11-W2-S8 Export Week 2 homework document (business case + MVP definition bundle).

### Week 3 — BRD, user flow, and story mapping

**Cohort outcomes:** one validated persona, one primary user flow (3–5 steps), one story map, completed build-ready BRD.

**Pre-work:** bring Week 2 MVP definition and ICP (no formal pre-work).

| Cohort deliverable | ARISE coverage | Status |
| --- | --- | --- |
| Validated user persona (Prompt 1) | Persona generator | Built |
| Primary user flow 3–5 steps (Prompt 2) | User flow generator | Built |
| Story map — steps + tasks, MVP marked (Prompt 3) | Story map generator | Built |
| Feature alignment from flow (Part 5) | Flow-aligned features from story map | Built |
| BRD assembly — persona, flow, story map, features, metrics (Prompt 4) | BRD assembler | Built |
| Session notes (persona, happy path, edge paths, story map, features, success) | Session notes Week 3 | Built |
| Homework: persona refinement | Stored persona artifact (manual refine in export) | Built |
| Homework: flow simplification | User flow artifact | Built |
| Homework: story map finalization | Story map artifact | Built |
| Homework: final BRD (all sections) | Export `/export/3` | Built |

**Note:** Week 2 **business case** (customer + problem + value + revenue) is not the same as Week 3 **BRD** (persona + flow + story map + build-ready requirements). E10-S1 should implement the Week 3 BRD assembly prompt, informed by Week 2 MVP scope.

**Maps to initiative wizard:** `persona` → `userflow` → `storymap` → `brd` (states: post-`mvp_finalized` through `brd_draft` → `design_approved`).

**Depends on:** Week 2 MVP finalize (1–2 features, NOT-build list) and Week 1 finalized concept.

**Stories**

- E11-W3-S1 Persona artifact (name, role, income, workflow, tools, frustrations, tried-before, pay trigger) — Prompt 1.
- E11-W3-S2 Primary user flow artifact (max 5 steps: entry → action → system response → value) — Prompt 2.
- E11-W3-S3 Story map artifact (3–5 steps, 1–3 tasks each, MVP tasks marked) — Prompt 3.
- E11-W3-S4 Flow-aligned feature list (core features tied to flow steps; cut orphans) — Part 5.
- E11-W3-S5 Build-ready BRD document (persona + flow + story map + features + success metrics) — Prompt 4 / E10-S1.
- E11-W3-S6 Session notes form (persona, happy path, edge paths, story map, success criteria).
- E11-W3-S7 Flow simplification pass (homework: reduce friction, faster value).
- E11-W3-S8 Export Week 3 homework bundle (persona + flow + story map + final BRD).

### Cohort weeks 1–3 → build sequence

| Week | Theme | Wizard steps | Target initiative states |
| --- | --- | --- | --- |
| 1 | Problem clarity + ICP | Problem & ICP → AI refinement → Finalize concept | `problem_captured` → `research_complete` → `problem_aligned` |
| 2 | Business case + MVP | Business case → MVP scoping → MVP finalize | `business_case_complete` → `solution_selected` → `mvp_finalized` |
| 3 | Experience design + BRD | Persona → User flow → Story map → BRD build | `persona_complete` → `userflow_complete` → `storymap_complete` → `brd_draft` → `design_approved` |
