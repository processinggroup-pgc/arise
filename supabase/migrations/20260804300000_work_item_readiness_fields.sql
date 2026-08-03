-- Milestone 2 / E2-S4: readiness fields on work items

alter table public.arise_work_items
  add column if not exists current_behavior text not null default '',
  add column if not exists measurable_outcome text not null default '',
  add column if not exists affected_systems jsonb not null default '[]'::jsonb,
  add column if not exists dependencies jsonb not null default '[]'::jsonb,
  add column if not exists decision_authority text not null default '',
  add column if not exists unresolved_questions jsonb not null default '[]'::jsonb;
