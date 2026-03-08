create extension if not exists pgcrypto;

create table if not exists public."order" (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete restrict,
  organization_id uuid not null references public.organization(id) on delete cascade,
  type text not null check (type in ('sale', 'order')),
  status text not null check (status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  subtotal numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  delivery_datetime timestamptz,
  delivery_address text
);

create table if not exists public.order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public."order"(id) on delete cascade,
  product_id uuid not null references public.product(id) on delete restrict,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  total numeric(10, 2) not null,
  note text,
  delivery_type text not null check (delivery_type in ('pickup', 'delivery'))
);

create table if not exists public.order_item_customization (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_item(id) on delete cascade,
  name text not null,
  value text not null
);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public."order"(id) on delete cascade,
  method text not null check (method in ('pix', 'cash', 'credit_card', 'debit_card', 'transfer')),
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_organization_id_idx on public."order" (organization_id);
create index if not exists order_customer_id_idx on public."order" (customer_id);
create index if not exists order_status_idx on public."order" (status);
create index if not exists order_delivery_datetime_idx on public."order" (delivery_datetime);

create index if not exists order_item_order_id_idx on public.order_item (order_id);
create index if not exists order_item_product_id_idx on public.order_item (product_id);

create index if not exists order_item_customization_order_item_id_idx on public.order_item_customization (order_item_id);

create index if not exists order_payments_order_id_idx on public.order_payments (order_id);
create index if not exists order_payments_status_idx on public.order_payments (status);

alter table public."order" enable row level security;
alter table public.order_item enable row level security;
alter table public.order_item_customization enable row level security;
alter table public.order_payments enable row level security;

drop policy if exists "order_select_own_organization" on public."order";
create policy "order_select_own_organization"
on public."order"
for select
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = "order".organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_insert_own_organization" on public."order";
create policy "order_insert_own_organization"
on public."order"
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization
    where organization.id = "order".organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_update_own_organization" on public."order";
create policy "order_update_own_organization"
on public."order"
for update
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = "order".organization_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization
    where organization.id = "order".organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_delete_own_organization" on public."order";
create policy "order_delete_own_organization"
on public."order"
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization
    where organization.id = "order".organization_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_select_own_organization" on public.order_item;
create policy "order_item_select_own_organization"
on public.order_item
for select
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_item.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_insert_own_organization" on public.order_item;
create policy "order_item_insert_own_organization"
on public.order_item
for insert
to authenticated
with check (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_item.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_update_own_organization" on public.order_item;
create policy "order_item_update_own_organization"
on public.order_item
for update
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_item.order_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_item.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_delete_own_organization" on public.order_item;
create policy "order_item_delete_own_organization"
on public.order_item
for delete
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_item.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_customization_select_own_organization" on public.order_item_customization;
create policy "order_item_customization_select_own_organization"
on public.order_item_customization
for select
to authenticated
using (
  exists (
    select 1
    from public.order_item
    join public."order" on "order".id = order_item.order_id
    join public.organization on organization.id = "order".organization_id
    where order_item.id = order_item_customization.order_item_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_customization_insert_own_organization" on public.order_item_customization;
create policy "order_item_customization_insert_own_organization"
on public.order_item_customization
for insert
to authenticated
with check (
  exists (
    select 1
    from public.order_item
    join public."order" on "order".id = order_item.order_id
    join public.organization on organization.id = "order".organization_id
    where order_item.id = order_item_customization.order_item_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_customization_update_own_organization" on public.order_item_customization;
create policy "order_item_customization_update_own_organization"
on public.order_item_customization
for update
to authenticated
using (
  exists (
    select 1
    from public.order_item
    join public."order" on "order".id = order_item.order_id
    join public.organization on organization.id = "order".organization_id
    where order_item.id = order_item_customization.order_item_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.order_item
    join public."order" on "order".id = order_item.order_id
    join public.organization on organization.id = "order".organization_id
    where order_item.id = order_item_customization.order_item_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_item_customization_delete_own_organization" on public.order_item_customization;
create policy "order_item_customization_delete_own_organization"
on public.order_item_customization
for delete
to authenticated
using (
  exists (
    select 1
    from public.order_item
    join public."order" on "order".id = order_item.order_id
    join public.organization on organization.id = "order".organization_id
    where order_item.id = order_item_customization.order_item_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_payments_select_own_organization" on public.order_payments;
create policy "order_payments_select_own_organization"
on public.order_payments
for select
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_payments.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_payments_insert_own_organization" on public.order_payments;
create policy "order_payments_insert_own_organization"
on public.order_payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_payments.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_payments_update_own_organization" on public.order_payments;
create policy "order_payments_update_own_organization"
on public.order_payments
for update
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_payments.order_id
      and organization.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_payments.order_id
      and organization.owner_id = auth.uid()
  )
);

drop policy if exists "order_payments_delete_own_organization" on public.order_payments;
create policy "order_payments_delete_own_organization"
on public.order_payments
for delete
to authenticated
using (
  exists (
    select 1
    from public."order"
    join public.organization on organization.id = "order".organization_id
    where "order".id = order_payments.order_id
      and organization.owner_id = auth.uid()
  )
);
