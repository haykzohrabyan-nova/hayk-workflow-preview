-- Soft-remove orders (admin-only visibility for removed rows)

alter table public.orders
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references auth.users (id) on delete set null;

create index if not exists orders_removed_at_idx on public.orders (tenant_id, removed_at)
  where removed_at is not null;

drop policy if exists "orders_member_all" on public.orders;

create policy "orders_select_member" on public.orders
  for select using (
    public.is_tenant_member(tenant_id)
    and (
      removed_at is null
      or public.is_tenant_admin(tenant_id)
    )
  );

create policy "orders_insert_member" on public.orders
  for insert with check (
    public.is_tenant_member(tenant_id)
    and removed_at is null
  );

create policy "orders_update_member" on public.orders
  for update using (
    public.is_tenant_member(tenant_id)
    and (
      removed_at is null
      or public.is_tenant_admin(tenant_id)
    )
  )
  with check (
    public.is_tenant_member(tenant_id)
    and (
      public.is_tenant_admin(tenant_id)
      or removed_at is null
    )
  );

create policy "orders_delete_admin" on public.orders
  for delete using (public.is_tenant_admin(tenant_id));
-- SKU gallery images (SKUs live in orders.specs.skus JSON; sku_id is that row's id)
create table if not exists public.order_sku_images (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  order_id     uuid not null references public.orders (id) on delete cascade,
  sku_id       uuid not null,
  file_name    text not null,
  file_size    bigint,
  mime_type    text,
  storage_path text not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists order_sku_images_sku_idx
  on public.order_sku_images (sku_id);
create index if not exists order_sku_images_order_idx
  on public.order_sku_images (order_id);

alter table public.order_sku_images enable row level security;

create policy "order_sku_images_member_all" on public.order_sku_images
  for all using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
