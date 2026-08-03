-- Milestone 1 / E1-S1: organizations and memberships

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  plan text not null check (plan in ('starter', 'team', 'enterprise')),
  data_region text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key,
  email text not null unique check (char_length(trim(email)) > 0),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_organization_id_idx
  on public.organization_memberships (organization_id);

create index if not exists organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_memberships enable row level security;
