create extension if not exists pgcrypto;

create table if not exists public.organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_owner_unique unique (owner_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_set_updated_at on public.organization;
create trigger organization_set_updated_at
before update on public.organization
for each row
execute function public.set_updated_at();

alter table public.organization enable row level security;

drop policy if exists "organization_select_own" on public.organization;
create policy "organization_select_own"
on public.organization
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "organization_insert_own" on public.organization;
create policy "organization_insert_own"
on public.organization
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "organization_update_own" on public.organization;
create policy "organization_update_own"
on public.organization
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
