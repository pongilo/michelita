create extension if not exists pgcrypto;

create table if not exists public.customer (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists customer_organization_id_idx on public.customer (organization_id);

alter table public.customer enable row level security;

drop policy if exists "customer_select_own_organization" on public.customer;
create policy "customer_select_own_organization"
on public.customer
for select
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = customer.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "customer_insert_own_organization" on public.customer;
create policy "customer_insert_own_organization"
on public.customer
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization
    where organization.id = customer.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "customer_update_own_organization" on public.customer;
create policy "customer_update_own_organization"
on public.customer
for update
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = customer.organization_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization
    where organization.id = customer.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "customer_delete_own_organization" on public.customer;
create policy "customer_delete_own_organization"
on public.customer
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = customer.organization_id
      and organization.owner_id = auth.uid()
  )
);
