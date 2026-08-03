-- Milestone 9 / E9-S1: product discovery initiatives

create table if not exists public.initiatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  state text not null,
  owner_id uuid not null references public.user_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problem_briefs (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  raw_problem_description text not null,
  target_audience text not null,
  pain_points text[] not null,
  business_context text not null default '',
  desired_outcome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_research_dossiers (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  summary text not null,
  market_trends text[] not null,
  comparable_approaches jsonb not null,
  citations jsonb not null,
  framing_options jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists public.problem_alignments (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null unique references public.initiatives (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  selected_framing_id text not null,
  user_elaboration text not null default '',
  aligned_at timestamptz not null default now()
);

create index if not exists initiatives_organization_id_idx
  on public.initiatives (organization_id);

alter table public.initiatives enable row level security;
alter table public.problem_briefs enable row level security;
alter table public.market_research_dossiers enable row level security;
alter table public.problem_alignments enable row level security;
