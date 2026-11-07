# Optional PostgreSQL / Supabase schema (review-only)

This is a reference schema, **not a migration that has been applied or verified on a production database**. Copy only after reviewing permissions and running tests in a private staging project.

```sql
-- OPTIONAL PRODUCTION DATABASE FOUNDATION, NOT WIRED TO THE BROWSER DEMO.
-- Review and apply manually in a dedicated, empty Supabase/Postgres project.
-- The browser app must NOT use this schema for live writes until a trusted
-- server implements transactions, idempotency, payment verification and RBAC.
-- Do not put secret/service keys in VITE_ variables or the public repository.
create extension if not exists pgcrypto;

create table if not exists public.restaurant_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.restaurant_staff (
  organization_id uuid not null references public.restaurant_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('owner','manager','cashier','kitchen')),
  active boolean not null default true,
  primary key (organization_id, user_id)
);
create index if not exists restaurant_staff_user_idx on public.restaurant_staff(user_id);

create table if not exists public.restaurant_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.restaurant_organizations(id),
  sku text not null,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  available boolean not null default true,
  unique (organization_id,sku)
);
create index if not exists restaurant_products_org_idx on public.restaurant_products(organization_id);

create table if not exists public.restaurant_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.restaurant_organizations(id),
  created_by uuid not null references auth.users(id),
  status text not null check (status in ('draft','queued','preparing','ready','served','cancelled','refunded')),
  payment_status text not null check (payment_status in ('unpaid','pending','paid','refunded')),
  idempotency_key uuid not null,
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  unique (id, organization_id)
);
create index if not exists restaurant_orders_org_idx on public.restaurant_orders(organization_id);

create table if not exists public.restaurant_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  organization_id uuid not null,
  product_id uuid references public.restaurant_products(id),
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  foreign key (order_id, organization_id) references public.restaurant_orders(id,organization_id)
);
create index if not exists restaurant_order_lines_org_idx on public.restaurant_order_lines(organization_id);
create table if not exists public.restaurant_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  organization_id uuid not null,
  provider text not null,
  provider_reference text,
  amount numeric(12,2) not null check (amount > 0),
  verified_at timestamptz,
  unique(provider,provider_reference),
  foreign key (order_id, organization_id) references public.restaurant_orders(id,organization_id)
);
create index if not exists restaurant_payments_org_idx on public.restaurant_payments(organization_id);
create table if not exists public.restaurant_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.restaurant_organizations(id),
  table_label text not null,
  guest_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null check (status in ('booked','seated','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists restaurant_reservations_org_idx on public.restaurant_reservations(organization_id);

create table if not exists public.restaurant_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.restaurant_organizations(id),
  product_id uuid not null references public.restaurant_products(id),
  quantity_delta numeric(12,3) not null check (quantity_delta <> 0),
  reason text not null,
  source_reference uuid,
  recorded_at timestamptz not null default now()
);
create index if not exists restaurant_inventory_org_idx on public.restaurant_inventory_movements(organization_id);

create table if not exists public.restaurant_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.restaurant_organizations(id),
  actor_id uuid not null references auth.users(id),
  action text not null,
  record_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists restaurant_audit_org_idx on public.restaurant_audit_events(organization_id);

alter table public.restaurant_organizations enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.restaurant_products enable row level security;
alter table public.restaurant_orders enable row level security;
alter table public.restaurant_order_lines enable row level security;
alter table public.restaurant_payments enable row level security;
alter table public.restaurant_reservations enable row level security;
alter table public.restaurant_inventory_movements enable row level security;
alter table public.restaurant_audit_events enable row level security;

-- Owner can create a new organization for themselves. Owner ID cannot be
-- reassigned through Data API: intentionally no UPDATE policy for organizations.
create policy "organization_owner_create" on public.restaurant_organizations
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "organization_member_read" on public.restaurant_organizations
  for select to authenticated using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.restaurant_staff s
      where s.organization_id = id and s.user_id = (select auth.uid()) and s.active)
  );
-- Membership listing includes only the caller's own row, or rows of organizations
-- directly owned by the caller, avoiding policy self-recursion.
create policy "staff_visible" on public.restaurant_staff
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and o.owner_id = (select auth.uid()))
  );
create policy "staff_owner_insert" on public.restaurant_staff
  for insert to authenticated with check (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and o.owner_id = (select auth.uid()))
  );
create policy "staff_owner_update" on public.restaurant_staff
  for update to authenticated using (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and o.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and o.owner_id = (select auth.uid()))
  );
create policy "staff_owner_delete" on public.restaurant_staff
  for delete to authenticated using (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and o.owner_id = (select auth.uid()))
  );

create policy "menu_member_read" on public.restaurant_products
  for select to authenticated using (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and (o.owner_id = (select auth.uid())
        or exists (select 1 from public.restaurant_staff s
          where s.organization_id = o.id and s.user_id = (select auth.uid()) and s.active)))
  );
create policy "menu_manager_insert" on public.restaurant_products
  for insert to authenticated with check (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and (o.owner_id = (select auth.uid())
        or exists (select 1 from public.restaurant_staff s
          where s.organization_id = o.id and s.user_id = (select auth.uid())
            and s.staff_role = 'manager' and s.active)))
  );
create policy "menu_manager_update" on public.restaurant_products
  for update to authenticated using (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and (o.owner_id = (select auth.uid())
        or exists (select 1 from public.restaurant_staff s
          where s.organization_id = o.id and s.user_id = (select auth.uid())
            and s.staff_role = 'manager' and s.active)))
  ) with check (
    exists (select 1 from public.restaurant_organizations o
      where o.id = organization_id and (o.owner_id = (select auth.uid())
        or exists (select 1 from public.restaurant_staff s
          where s.organization_id = o.id and s.user_id = (select auth.uid())
            and s.staff_role = 'manager' and s.active)))
  );

-- Operational tables: authorized staff can read organization data.
-- NO INSERT/UPDATE/DELETE client policies on orders, payments, reservations,
-- inventory ledger, or audit log. Trusted transactional server writes only.
-- Do not use service_role secret in browser code. Build a secured server API
-- and test role isolation before enabling a hosted multi-user deployment.
create policy "orders_staff_read" on public.restaurant_orders for select to authenticated
  using (exists (select 1 from public.restaurant_organizations o
    where o.id = organization_id and (o.owner_id = (select auth.uid())
      or exists (select 1 from public.restaurant_staff s
        where s.organization_id = o.id and s.user_id = (select auth.uid()) and s.active))));
create policy "lines_staff_read" on public.restaurant_order_lines for select to authenticated
  using (exists (select 1 from public.restaurant_orders o
    where o.id = order_id and o.organization_id = organization_id));
create policy "reservations_staff_read" on public.restaurant_reservations for select to authenticated
  using (exists (select 1 from public.restaurant_organizations o
    where o.id = organization_id and (o.owner_id = (select auth.uid())
      or exists (select 1 from public.restaurant_staff s
        where s.organization_id = o.id and s.user_id = (select auth.uid()) and s.active))));
create policy "payments_manager_read" on public.restaurant_payments for select to authenticated
  using (exists (select 1 from public.restaurant_organizations o
    where o.id = organization_id and (o.owner_id = (select auth.uid())
      or exists (select 1 from public.restaurant_staff s
        where s.organization_id = o.id and s.user_id = (select auth.uid()) and s.staff_role = 'manager' and s.active))));
create policy "inventory_staff_read" on public.restaurant_inventory_movements for select to authenticated
  using (exists (select 1 from public.restaurant_organizations o
    where o.id = organization_id and (o.owner_id = (select auth.uid())
      or exists (select 1 from public.restaurant_staff s
        where s.organization_id = o.id and s.user_id = (select auth.uid()) and s.active))));
create policy "audit_owner_read" on public.restaurant_audit_events for select to authenticated
  using (exists (select 1 from public.restaurant_organizations o
    where o.id = organization_id and o.owner_id = (select auth.uid())));

-- Explicit privilege grants require enabled RLS to select any matching rows.
grant usage on schema public to authenticated;
grant select,insert on public.restaurant_organizations to authenticated;
grant select,insert,update,delete on public.restaurant_staff to authenticated;
grant select,insert,update on public.restaurant_products to authenticated;
grant select on public.restaurant_orders, public.restaurant_order_lines,
  public.restaurant_payments, public.restaurant_reservations,
  public.restaurant_inventory_movements, public.restaurant_audit_events to authenticated;

```
