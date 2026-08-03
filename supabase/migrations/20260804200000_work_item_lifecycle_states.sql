-- Milestone 2 / E2-S3: expand ARISE work item lifecycle states

alter table public.arise_work_items drop constraint if exists arise_work_items_state_check;

alter table public.arise_work_items
  add constraint arise_work_items_state_check
  check (
    state in (
      'draft',
      'assessing',
      'not_ready',
      'ready_for_recommendation',
      'recommendation_pending',
      'plan_approved',
      'implementing',
      'verifying',
      'preview_ready',
      'release_review',
      'released',
      'rejected',
      'cancelled'
    )
  );
