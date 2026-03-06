create extension if not exists pgcrypto;

create table if not exists public.product (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists product_organization_id_idx on public.product (organization_id);
create index if not exists product_active_idx on public.product (active);

alter table public.product enable row level security;

drop policy if exists "product_select_own_organization" on public.product;
create policy "product_select_own_organization"
on public.product
for select
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = product.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "product_insert_own_organization" on public.product;
create policy "product_insert_own_organization"
on public.product
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization
    where organization.id = product.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "product_update_own_organization" on public.product;
create policy "product_update_own_organization"
on public.product
for update
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = product.organization_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization
    where organization.id = product.organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "product_delete_own_organization" on public.product;
create policy "product_delete_own_organization"
on public.product
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = product.organization_id
      and organization.owner_id = auth.uid()
  )
);
