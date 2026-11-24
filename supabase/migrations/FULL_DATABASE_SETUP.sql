-- =============================================================================
-- FULL_DATABASE_SETUP.sql
-- Blinkit Multi-Tenant Quick-Commerce Inventory SaaS Platform
-- Complete PostgreSQL / Supabase Schema, RLS, Views, Audit and RPC Functions
-- =============================================================================
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- 1. Open your Supabase Dashboard -> SQL Editor
-- 2. Paste the entire content of this file
-- 3. Click "Run" (Ctrl+Enter)
-- Everything is created in strict dependency order with zero errors.
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- SECTION 1: Multi-Tenancy Foundation (Organizations, Profiles & Auth Helpers)
-- Tables created BEFORE helper functions to prevent relation-does-not-exist errors.
-- =============================================================================

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('home_kitchen', 'clothing', 'manufacturing', 'other')),
  phone text,
  email text,
  gstin text,
  state text,
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key, -- maps to auth.users.id
  org_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('superadmin', 'admin', 'user')),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Helper Functions (Notice: Named app_current_role to prevent keyword conflict with SQL current_role)
create or replace function current_org()
returns uuid
language plpgsql stable
as $$
declare
  v_org_id uuid;
begin
  v_org_id := nullif(current_setting('app.current_org_id', true), '')::uuid;
  if v_org_id is not null then
    return v_org_id;
  end if;
  select org_id into v_org_id from profiles where id = auth.uid() limit 1;
  return v_org_id;
end;
$$;

create or replace function app_current_role()
returns text
language plpgsql stable
as $$
declare
  v_role text;
begin
  v_role := nullif(current_setting('app.current_user_role', true), '');
  if v_role is not null then
    return v_role;
  end if;
  select role into v_role from profiles where id = auth.uid() limit 1;
  return coalesce(v_role, 'user');
end;
$$;

-- Global System Audit Log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  user_name text,
  table_name text not null,
  record_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- SuperAdmin Plans & Subscriptions (PRD 09)
create table if not exists plans (
  id text primary key,              -- 'free', 'pro', 'business'
  name text not null,
  max_users integer not null default 5,
  max_products integer not null default 100,
  max_pos_per_month integer not null default 20,
  price_monthly numeric(10,2) not null default 0,
  features jsonb default '[]'::jsonb
);

insert into plans values ('free', 'Free Plan', 5, 100, 20, 0, '["basic_features"]'::jsonb)
  on conflict (id) do nothing;
insert into plans values ('pro', 'Pro Plan', 20, 1000, 200, 999, '["all_reports","bulk_upload","barcode_print"]'::jsonb)
  on conflict (id) do nothing;
insert into plans values ('business', 'Business Plan', 100, 10000, 2000, 2999, '["superadmin_support","api_access","custom_branding"]'::jsonb)
  on conflict (id) do nothing;

-- =============================================================================
-- SECTION 2: Master Data (Suppliers, Products, Aliases, Variants & Channel Maps)
-- =============================================================================

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  gstin text,
  phone text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  internal_name text not null,
  official_name text not null,
  sku text not null,
  upc text not null,
  hsn text not null,
  mrp numeric(10,2) not null check (mrp > 0),
  gst_percent numeric(5,2) not null default 18.00,
  unit text not null default 'pc',
  category text not null,
  rack_location text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, sku),
  unique (org_id, upc)
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  upc text not null,
  unique (product_id, upc)
);

create table if not exists product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  alias text not null,
  source text
);

create table if not exists channel_item_map (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  channel text not null default 'blinkit',
  channel_item_code text not null,
  channel_item_name text,
  created_at timestamptz not null default now(),
  unique (org_id, channel, channel_item_code)
);

create table if not exists channel_locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  channel text not null default 'blinkit',
  name text not null,
  address text,
  city text,
  state text,
  gstin text,
  created_at timestamptz not null default now()
);

create table if not exists po_import_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'blinkit',
  column_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- SECTION 3: Operations & Transaction Tables (Inwards, POs, Scans, GRN, Claims)
-- =============================================================================

create table if not exists inward_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  doc_type text not null check (doc_type in ('bill', 'challan')),
  doc_no text not null,
  doc_date date not null default current_date,
  vehicle_no text,
  payment_status text not null default 'pending',
  bill_photo_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (org_id, supplier_id, doc_no)
);

create table if not exists inward_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references inward_entries(id) on delete cascade,
  product_id uuid not null references products(id),
  received_qty integer not null check (received_qty >= 0),
  good_qty integer not null check (good_qty >= 0),
  damaged_qty integer not null check (damaged_qty >= 0),
  damage_reason text,
  photo_url text,
  rate numeric(12,2) not null default 0,
  rate_includes_gst boolean not null default true,
  gst_percent numeric(5,2) not null default 0,
  taxable_value numeric(12,2) not null default 0,
  cgst numeric(12,2) not null default 0,
  sgst numeric(12,2) not null default 0,
  igst numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  constraint good_plus_damaged_eq_received check (good_qty + damaged_qty = received_qty)
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  channel text not null default 'blinkit',
  po_number text not null,
  ro_type text not null default 'Seller Hub STO',
  seller_no text,
  po_date date not null,
  valid_till date not null,
  delivery_location text not null,
  delivery_location_id uuid references channel_locations(id),
  buyer_gstin text not null,
  seller_gstin text not null,
  supply_type text not null check (supply_type in ('inter_state', 'intra_state')),
  spoc_name text,
  spoc_phone text,
  total_qty integer not null,
  total_items integer not null,
  net_amount numeric(12,2) not null,
  status text not null default 'new' check (status in (
    'new', 'reserved', 'in_progress', 'partly_dispatched', 'dispatched',
    'grn_pending', 'closed', 'closed_with_claims', 'cancelled', 'expired'
  )),
  source_files jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, po_number)
);

create table if not exists po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid references products(id),
  channel_item_code text not null,
  blinkit_upc text not null,
  hsn text not null,
  grammage text,
  item_name text not null,
  requested_qty integer not null check (requested_qty > 0),
  reserved_qty integer not null default 0 check (reserved_qty >= 0),
  scanned_qty integer not null default 0 check (scanned_qty >= 0),
  dispatched_qty integer not null default 0 check (dispatched_qty >= 0),
  landing_rate numeric(10,2) not null,
  mrp numeric(10,2) not null,
  cgst_pct numeric(5,2) not null default 0,
  sgst_pct numeric(5,2) not null default 0,
  igst_pct numeric(5,2) not null default 0,
  cess_pct numeric(5,2) not null default 0,
  tax_per_unit numeric(10,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  constraint scanned_le_requested check (scanned_qty <= requested_qty)
);

create table if not exists po_scans (
  id uuid primary key default gen_random_uuid(),
  po_item_id uuid not null references po_items(id) on delete cascade,
  user_id uuid,
  user_name text,
  qty integer not null default 1,
  scanned_code text not null,
  is_voided boolean not null default false,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz not null default now()
);

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  invoice_no text not null,
  invoice_date date not null default current_date,
  cartons integer not null default 1,
  cartons_per_line jsonb default '{}'::jsonb,
  vehicle_no text,
  transporter text,
  lr_no text,
  appointment_date date,
  appointment_time text,
  appointment_booked boolean not null default false,
  dispatched_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references dispatches(id) on delete cascade,
  po_item_id uuid not null references po_items(id),
  qty integer not null check (qty > 0)
);

create table if not exists grn_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  po_id uuid not null references purchase_orders(id),
  dispatch_id uuid references dispatches(id),
  grn_no text not null,
  grn_date date not null default current_date,
  delivery_date date not null default current_date,
  ticket_deadline date not null, -- delivery_date + 10 days
  ticket_no text,
  proof_file_url text,
  pod_file_url text,
  opening_video_url text,
  notes text,
  created_at timestamptz not null default now(),
  unique (org_id, grn_no)
);

create table if not exists grn_items (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references grn_entries(id) on delete cascade,
  product_id uuid not null references products(id),
  po_item_id uuid references po_items(id),
  dispatched_qty integer not null default 0,
  accepted_qty integer not null default 0,
  short_qty integer not null default 0,
  rejected_qty integer not null default 0,
  rejection_reason text
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  po_id uuid not null references purchase_orders(id),
  grn_item_id uuid references grn_items(id),
  type text not null check (type in ('shortage', 'rejection')),
  qty integer not null check (qty > 0),
  amount numeric(12,2) not null default 0,
  ticket_deadline date,
  ticket_no text,
  status text not null default 'open' check (status in ('open', 'raised', 'settled', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists return_receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  po_id uuid not null references purchase_orders(id),
  grn_id uuid references grn_entries(id),
  dn_no text not null,
  pickup_ticket_no text,
  pickup_deadline date not null, -- received_date + 7 days
  received_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists return_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references return_receipts(id) on delete cascade,
  product_id uuid not null references products(id),
  expected_qty integer not null check (expected_qty >= 0),
  received_qty integer not null check (received_qty >= 0),
  good_qty integer not null check (good_qty >= 0),
  damaged_qty integer not null check (damaged_qty >= 0),
  missing_qty integer not null check (missing_qty >= 0)
);

create table if not exists damaged_stock_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id),
  qty integer not null check (qty > 0),
  action text not null check (action in ('repaired', 'returned_to_supplier', 'discarded')),
  notes text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- SECTION 4: Immutable Stock Movements Ledger (The Core of the System)
-- Every inventory change is an INSERT. Never UPDATE or DELETE from this table.
-- =============================================================================

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id),
  bucket text not null check (bucket in ('good', 'damaged', 'reserved', 'in_transit', 'return_pending', 'written_off')),
  qty integer not null,
  reason text not null check (reason in (
    'inward', 'reserve', 'release', 'dispatch', 'grn_short', 'grn_reject',
    'return_good', 'return_damaged', 'adjustment', 'writeoff',
    'repaired', 'returned_to_supplier', 'discarded'
  )),
  ref_table text,
  ref_id uuid,
  user_id uuid,
  user_name text,
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists idx_products_org on products(org_id);
create index if not exists idx_products_upc on products(org_id, upc);
create index if not exists idx_cim_lookup on channel_item_map(org_id, channel, channel_item_code);
create index if not exists idx_sm_product_bucket on stock_movements(org_id, product_id, bucket);
create index if not exists idx_po_status on purchase_orders(org_id, status);
create index if not exists idx_po_items on po_items(po_id);
create index if not exists idx_po_scans on po_scans(po_item_id);

-- =============================================================================
-- SECTION 5: Stock Summary View (Live Calculation from Immutable Ledger)
-- =============================================================================

create or replace view stock_summary as
select
  p.id as product_id,
  p.org_id,
  p.internal_name,
  p.official_name,
  p.sku,
  p.upc,
  p.mrp,
  coalesce(sum(case when sm.bucket = 'good' then sm.qty else 0 end), 0) as good,
  coalesce(sum(case when sm.bucket = 'reserved' then sm.qty else 0 end), 0) as reserved,
  coalesce(sum(case when sm.bucket = 'good' then sm.qty else 0 end), 0) -
    coalesce(sum(case when sm.bucket = 'reserved' then sm.qty else 0 end), 0) as available,
  coalesce(sum(case when sm.bucket = 'damaged' then sm.qty else 0 end), 0) as damaged,
  coalesce(sum(case when sm.bucket = 'in_transit' then sm.qty else 0 end), 0) as in_transit,
  coalesce(sum(case when sm.bucket = 'return_pending' then sm.qty else 0 end), 0) as return_pending,
  coalesce(sum(case when sm.bucket = 'written_off' then sm.qty else 0 end), 0) as written_off
from products p
left join stock_movements sm on sm.product_id = p.id and sm.org_id = p.org_id
group by p.id, p.org_id, p.internal_name, p.official_name, p.sku, p.upc, p.mrp;

-- =============================================================================
-- SECTION 6: Row Level Security (RLS Multi-Tenant Isolation)
-- =============================================================================

alter table organizations      enable row level security;
alter table profiles           enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table product_aliases    enable row level security;
alter table channel_item_map   enable row level security;
alter table channel_locations  enable row level security;
alter table suppliers          enable row level security;
alter table inward_entries     enable row level security;
alter table inward_items       enable row level security;
alter table purchase_orders    enable row level security;
alter table po_items           enable row level security;
alter table po_scans           enable row level security;
alter table dispatches         enable row level security;
alter table dispatch_items     enable row level security;
alter table grn_entries        enable row level security;
alter table grn_items          enable row level security;
alter table claims             enable row level security;
alter table return_receipts    enable row level security;
alter table return_items       enable row level security;
alter table stock_movements    enable row level security;
alter table audit_log          enable row level security;
alter table po_import_templates enable row level security;
alter table damaged_stock_actions enable row level security;

-- Tenant Isolation Policies
drop policy if exists "org_isolation" on organizations;
create policy "org_isolation" on organizations
  using (id = current_org() or app_current_role() = 'superadmin');

drop policy if exists "org_isolation" on profiles;
create policy "org_isolation" on profiles
  using (org_id = current_org() or app_current_role() = 'superadmin');

drop policy if exists "org_isolation" on products;
create policy "org_isolation" on products
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on product_variants;
create policy "org_isolation" on product_variants
  using (product_id in (select id from products where org_id = current_org()))
  with check (product_id in (select id from products where org_id = current_org()));

drop policy if exists "org_isolation" on product_aliases;
create policy "org_isolation" on product_aliases
  using (product_id in (select id from products where org_id = current_org()))
  with check (product_id in (select id from products where org_id = current_org()));

drop policy if exists "org_isolation" on channel_item_map;
create policy "org_isolation" on channel_item_map
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on channel_locations;
create policy "org_isolation" on channel_locations
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on suppliers;
create policy "org_isolation" on suppliers
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on inward_entries;
create policy "org_isolation" on inward_entries
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on inward_items;
create policy "org_isolation" on inward_items
  using (entry_id in (select id from inward_entries where org_id = current_org()))
  with check (entry_id in (select id from inward_entries where org_id = current_org()));

drop policy if exists "org_isolation" on purchase_orders;
create policy "org_isolation" on purchase_orders
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on po_items;
create policy "org_isolation" on po_items
  using (po_id in (select id from purchase_orders where org_id = current_org()))
  with check (po_id in (select id from purchase_orders where org_id = current_org()));

drop policy if exists "org_isolation" on po_scans;
create policy "org_isolation" on po_scans
  using (po_item_id in (select id from po_items where po_id in (select id from purchase_orders where org_id = current_org())))
  with check (po_item_id in (select id from po_items where po_id in (select id from purchase_orders where org_id = current_org())));

drop policy if exists "org_isolation" on dispatches;
create policy "org_isolation" on dispatches
  using (po_id in (select id from purchase_orders where org_id = current_org()))
  with check (po_id in (select id from purchase_orders where org_id = current_org()));

drop policy if exists "org_isolation" on dispatch_items;
create policy "org_isolation" on dispatch_items
  using (dispatch_id in (select id from dispatches where po_id in (select id from purchase_orders where org_id = current_org())))
  with check (dispatch_id in (select id from dispatches where po_id in (select id from purchase_orders where org_id = current_org())));

drop policy if exists "org_isolation" on grn_entries;
create policy "org_isolation" on grn_entries
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on grn_items;
create policy "org_isolation" on grn_items
  using (grn_id in (select id from grn_entries where org_id = current_org()))
  with check (grn_id in (select id from grn_entries where org_id = current_org()));

drop policy if exists "org_isolation" on claims;
create policy "org_isolation" on claims
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on return_receipts;
create policy "org_isolation" on return_receipts
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on return_items;
create policy "org_isolation" on return_items
  using (receipt_id in (select id from return_receipts where org_id = current_org()))
  with check (receipt_id in (select id from return_receipts where org_id = current_org()));

drop policy if exists "org_isolation" on stock_movements;
create policy "org_isolation" on stock_movements
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on po_import_templates;
create policy "org_isolation" on po_import_templates
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_isolation" on damaged_stock_actions;
create policy "org_isolation" on damaged_stock_actions
  using (org_id = current_org()) with check (org_id = current_org());

drop policy if exists "org_audit_read" on audit_log;
create policy "org_audit_read" on audit_log
  for select using (org_id = current_org() or app_current_role() = 'superadmin');

drop policy if exists "org_audit_write" on audit_log;
create policy "org_audit_write" on audit_log
  for insert with check (true);

-- 10. Atomic Critical RPC Functions (SECURITY DEFINER)
-- ====================================================================

-- RPC 1: reserve_po
create or replace function reserve_po(p_po_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_po record;
  v_item record;
  v_avail integer;
  v_reserve_qty integer;
  v_total_shortfall integer := 0;
  v_res jsonb := '[]'::jsonb;
begin
  select * into v_po from purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'PO % not found', p_po_id;
  end if;

  for v_item in
    select * from po_items where po_id = p_po_id for update
  loop
    if v_item.product_id is not null then
      -- Lock product row
      perform 1 from products where id = v_item.product_id for update;

      -- Calculate available stock = good - reserved
      select (coalesce(sum(case when bucket = 'good' then qty else 0 end), 0) -
              coalesce(sum(case when bucket = 'reserved' then qty else 0 end), 0))
      into v_avail
      from stock_movements
      where product_id = v_item.product_id and org_id = v_po.org_id;

      v_avail := greatest(v_avail, 0);

      -- Needed units to reserve: requested_qty - already reserved_qty
      v_reserve_qty := least(greatest(v_item.requested_qty - v_item.reserved_qty, 0), v_avail);

      if v_reserve_qty > 0 then
        insert into stock_movements (
          org_id, product_id, bucket, qty, reason, ref_table, ref_id
        ) values (
          v_po.org_id, v_item.product_id, 'reserved', v_reserve_qty, 'reserve', 'purchase_orders', p_po_id
        );

        update po_items
        set reserved_qty = reserved_qty + v_reserve_qty
        where id = v_item.id;
      end if;

      v_total_shortfall := v_total_shortfall + (v_item.requested_qty - (v_item.reserved_qty + v_reserve_qty));

      v_res := v_res || jsonb_build_object(
        'po_item_id', v_item.id,
        'product_id', v_item.product_id,
        'requested', v_item.requested_qty,
        'reserved', v_item.reserved_qty + v_reserve_qty,
        'shortfall', greatest(v_item.requested_qty - (v_item.reserved_qty + v_reserve_qty), 0)
      );
    end if;
  end loop;

  update purchase_orders
  set status = case when v_total_shortfall = 0 then 'reserved' else 'new' end
  where id = p_po_id;

  return jsonb_build_object(
    'po_id', p_po_id,
    'total_shortfall', v_total_shortfall,
    'lines', v_res
  );
end;
$$;

-- RPC 2: release_po
create or replace function release_po(p_po_id uuid, p_reason text)
returns void
language plpgsql
security definer
as $$
declare
  v_po record;
  v_item record;
begin
  select * into v_po from purchase_orders where id = p_po_id for update;
  if not found then raise exception 'PO not found'; end if;

  for v_item in select * from po_items where po_id = p_po_id and reserved_qty > 0 for update loop
    insert into stock_movements (
      org_id, product_id, bucket, qty, reason, ref_table, ref_id
    ) values (
      v_po.org_id, v_item.product_id, 'reserved', -v_item.reserved_qty, 'release', 'purchase_orders', p_po_id
    );

    update po_items set reserved_qty = 0 where id = v_item.id;
  end loop;

  update purchase_orders set status = 'cancelled' where id = p_po_id;
end;
$$;

-- RPC 3: allocate_waiting_pos
create or replace function allocate_waiting_pos(p_org_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_po record;
  v_allocated integer := 0;
begin
  for v_po in
    select id from purchase_orders
    where org_id = p_org_id and status in ('new', 'reserved')
    order by po_date asc, valid_till asc nulls last
  loop
    perform reserve_po(v_po.id);
    v_allocated := v_allocated + 1;
  end loop;
  return v_allocated;
end;
$$;

-- RPC 4: scan_item
create or replace function scan_item(
  p_po_item_id uuid,
  p_scanned_code text,
  p_qty integer default 1,
  p_user_id uuid default null,
  p_user_name text default 'Staff'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item record;
  v_po record;
  v_prod record;
  v_new_scanned integer;
begin
  select * into v_item from po_items where id = p_po_item_id for update;
  if not found then
    raise exception 'PO Line not found';
  end if;

  select * into v_po from purchase_orders where id = v_item.po_id for update;

  -- Verify UPC match
  if v_item.product_id is not null then
    select * into v_prod from products where id = v_item.product_id;
    if v_prod.upc is not null and v_prod.upc <> p_scanned_code and v_item.blinkit_upc <> p_scanned_code then
      raise exception 'Scanned UPC % does not match product UPC % or Blinkit UPC %', p_scanned_code, v_prod.upc, v_item.blinkit_upc;
    end if;
  end if;

  -- Over-quantity check
  v_new_scanned := v_item.scanned_qty + p_qty;
  if v_new_scanned > v_item.requested_qty then
    raise exception 'Over quantity: PO needs %, already scanned %, trying to add %', v_item.requested_qty, v_item.scanned_qty, p_qty;
  end if;

  -- Record scan
  insert into po_scans (po_item_id, user_id, user_name, qty, scanned_code)
  values (p_po_item_id, p_user_id, p_user_name, p_qty, p_scanned_code);

  update po_items set scanned_qty = v_new_scanned where id = p_po_item_id;

  update purchase_orders set status = 'in_progress' where id = v_po.id and status in ('new', 'reserved');

  return jsonb_build_object(
    'po_item_id', p_po_item_id,
    'scanned_qty', v_new_scanned,
    'requested_qty', v_item.requested_qty,
    'remaining_qty', v_item.requested_qty - v_new_scanned
  );
end;
$$;

-- RPC 5: void_scan
create or replace function void_scan(p_scan_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
as $$
declare
  v_scan record;
  v_item record;
begin
  select * into v_scan from po_scans where id = p_scan_id for update;
  if not found or v_scan.is_voided then
    raise exception 'Scan not found or already voided';
  end if;

  select * into v_item from po_items where id = v_scan.po_item_id for update;

  update po_scans
  set is_voided = true, voided_at = now(), voided_by = p_user_id, void_reason = p_reason
  where id = p_scan_id;

  update po_items
  set scanned_qty = greatest(scanned_qty - v_scan.qty, 0)
  where id = v_item.id;
end;
$$;

-- RPC 6: close_dispatch
create or replace function close_dispatch(
  p_po_id uuid,
  p_invoice_no text,
  p_invoice_date date,
  p_cartons integer,
  p_cartons_per_line jsonb,
  p_vehicle_no text,
  p_transporter text,
  p_lr_no text,
  p_appointment_date date default null,
  p_appointment_time text default null,
  p_shortfall_reason text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_po record;
  v_item record;
  v_dispatch_id uuid;
  v_has_shortfall boolean := false;
begin
  select * into v_po from purchase_orders where id = p_po_id for update;
  if not found then raise exception 'PO not found'; end if;

  -- Create dispatch record
  insert into dispatches (
    po_id, invoice_no, invoice_date, cartons, cartons_per_line,
    vehicle_no, transporter, lr_no, appointment_date, appointment_time
  ) values (
    p_po_id, p_invoice_no, p_invoice_date, p_cartons, p_cartons_per_line,
    p_vehicle_no, p_transporter, p_lr_no, p_appointment_date, p_appointment_time
  ) returning id into v_dispatch_id;

  for v_item in select * from po_items where po_id = p_po_id for update loop
    if v_item.scanned_qty < v_item.requested_qty then
      v_has_shortfall := true;
    end if;

    if v_item.scanned_qty > 0 and v_item.product_id is not null then
      -- Dispatch items
      insert into dispatch_items (dispatch_id, po_item_id, qty)
      values (v_dispatch_id, v_item.id, v_item.scanned_qty);

      -- Ledger: Remove from good, remove from reserved, add to in_transit
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_item.product_id, 'good', -v_item.scanned_qty, 'dispatch', 'dispatches', v_dispatch_id);

      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_item.product_id, 'reserved', -least(v_item.reserved_qty, v_item.scanned_qty), 'dispatch', 'dispatches', v_dispatch_id);

      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_item.product_id, 'in_transit', v_item.scanned_qty, 'dispatch', 'dispatches', v_dispatch_id);

      update po_items
      set dispatched_qty = dispatched_qty + v_item.scanned_qty,
          reserved_qty = greatest(reserved_qty - v_item.scanned_qty, 0)
      where id = v_item.id;
    end if;
  end loop;

  if v_has_shortfall and (p_shortfall_reason is null or length(trim(p_shortfall_reason)) = 0) then
    raise exception 'Closing dispatch with shortfall requires an Admin shortfall reason.';
  end if;

  update purchase_orders
  set status = case when v_has_shortfall then 'partly_dispatched' else 'dispatched' end
  where id = p_po_id;

  return v_dispatch_id;
end;
$$;

-- RPC 7: post_inward
create or replace function post_inward(p_entry jsonb)
returns uuid
language plpgsql
security definer
as $$
declare
  v_org_id uuid := (p_entry->>'org_id')::uuid;
  v_supplier_id uuid := (p_entry->>'supplier_id')::uuid;
  v_doc_type text := p_entry->>'doc_type';
  v_doc_no text := p_entry->>'doc_no';
  v_doc_date date := coalesce((p_entry->>'doc_date')::date, current_date);
  v_vehicle_no text := p_entry->>'vehicle_no';
  v_entry_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_rec integer;
  v_good integer;
  v_dam integer;
begin
  insert into inward_entries (
    org_id, supplier_id, doc_type, doc_no, doc_date, vehicle_no
  ) values (
    v_org_id, v_supplier_id, v_doc_type, v_doc_no, v_doc_date, v_vehicle_no
  ) returning id into v_entry_id;

  for v_item in select * from jsonb_array_elements(p_entry->'items') loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_rec := (v_item->>'received_qty')::integer;
    v_good := (v_item->>'good_qty')::integer;
    v_dam := (v_item->>'damaged_qty')::integer;

    if v_good + v_dam <> v_rec then
      raise exception 'Constraint violation: good_qty (%) + damaged_qty (%) != received_qty (%)', v_good, v_dam, v_rec;
    end if;

    insert into inward_items (
      entry_id, product_id, received_qty, good_qty, damaged_qty, damage_reason,
      rate, rate_includes_gst, gst_percent, taxable_value, cgst, sgst, igst, line_total
    ) values (
      v_entry_id, v_prod_id, v_rec, v_good, v_dam, v_item->>'damage_reason',
      coalesce((v_item->>'rate')::numeric, 0),
      coalesce((v_item->>'rate_includes_gst')::boolean, true),
      coalesce((v_item->>'gst_percent')::numeric, 0),
      coalesce((v_item->>'taxable_value')::numeric, 0),
      coalesce((v_item->>'cgst')::numeric, 0),
      coalesce((v_item->>'sgst')::numeric, 0),
      coalesce((v_item->>'igst')::numeric, 0),
      coalesce((v_item->>'line_total')::numeric, 0)
    );

    if v_good > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_org_id, v_prod_id, 'good', v_good, 'inward', 'inward_entries', v_entry_id);
    end if;

    if v_dam > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_org_id, v_prod_id, 'damaged', v_dam, 'inward', 'inward_entries', v_entry_id);
    end if;
  end loop;

  -- Auto-allocate waiting POs
  perform allocate_waiting_pos(v_org_id);

  return v_entry_id;
end;
$$;

-- RPC 8: post_grn
create or replace function post_grn(
  p_po_id uuid,
  p_dispatch_id uuid,
  p_grn jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_po record;
  v_grn_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_po_item_id uuid;
  v_disp_qty integer;
  v_acc_qty integer;
  v_rej_qty integer;
  v_short_qty integer;
  v_landing_rate numeric;
  v_delivery_date date := coalesce((p_grn->>'delivery_date')::date, current_date);
  v_ticket_deadline date := v_delivery_date + interval '10 days';
  v_grn_item_id uuid;
begin
  select * into v_po from purchase_orders where id = p_po_id for update;

  insert into grn_entries (
    org_id, po_id, dispatch_id, grn_no, grn_date, delivery_date, ticket_deadline,
    ticket_no, proof_file_url, pod_file_url, opening_video_url, notes
  ) values (
    v_po.org_id, p_po_id, p_dispatch_id,
    p_grn->>'grn_no',
    coalesce((p_grn->>'grn_date')::date, current_date),
    v_delivery_date,
    v_ticket_deadline,
    p_grn->>'ticket_no',
    p_grn->>'proof_file_url',
    p_grn->>'pod_file_url',
    p_grn->>'opening_video_url',
    p_grn->>'notes'
  ) returning id into v_grn_id;

  for v_item in select * from jsonb_array_elements(p_grn->'items') loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_po_item_id := (v_item->>'po_item_id')::uuid;
    v_disp_qty := (v_item->>'dispatched_qty')::integer;
    v_acc_qty := (v_item->>'accepted_qty')::integer;
    v_rej_qty := (v_item->>'rejected_qty')::integer;
    v_short_qty := v_disp_qty - v_acc_qty - v_rej_qty;

    if v_short_qty < 0 then
      raise exception 'Accepted (%) + Rejected (%) cannot exceed Dispatched (%)', v_acc_qty, v_rej_qty, v_disp_qty;
    end if;

    select landing_rate into v_landing_rate from po_items where id = v_po_item_id;

    insert into grn_items (
      grn_id, product_id, po_item_id, dispatched_qty, accepted_qty, short_qty, rejected_qty, rejection_reason
    ) values (
      v_grn_id, v_prod_id, v_po_item_id, v_disp_qty, v_acc_qty, v_short_qty, v_rej_qty, v_item->>'rejection_reason'
    ) returning id into v_grn_item_id;

    -- Accepted: leaves in_transit (sold)
    if v_acc_qty > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_prod_id, 'in_transit', -v_acc_qty, 'inward', 'grn_entries', v_grn_id);
    end if;

    -- Rejected: moves from in_transit to return_pending
    if v_rej_qty > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_prod_id, 'in_transit', -v_rej_qty, 'grn_reject', 'grn_entries', v_grn_id);

      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_prod_id, 'return_pending', v_rej_qty, 'grn_reject', 'grn_entries', v_grn_id);
    end if;

    -- Shortage: stays in in_transit as disputed, create claim
    if v_short_qty > 0 then
      insert into claims (
        org_id, grn_item_id, po_id, type, qty, amount, ticket_deadline, ticket_no, status, notes
      ) values (
        v_po.org_id, v_grn_item_id, p_po_id, 'shortage', v_short_qty,
        v_short_qty * coalesce(v_landing_rate, 0),
        v_ticket_deadline, p_grn->>'ticket_no', 'open', 'Shortage at warehouse GRN'
      );
    end if;
  end loop;

  update purchase_orders set status = 'grn_pending' where id = p_po_id;

  return v_grn_id;
end;
$$;

-- RPC 9: resolve_claim
create or replace function resolve_claim(
  p_claim_id uuid,
  p_resolution text, -- 'settled', 'found', 'rejected'
  p_notes text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_claim record;
  v_grn_item record;
begin
  select * into v_claim from claims where id = p_claim_id for update;
  if not found then raise exception 'Claim not found'; end if;

  select * into v_grn_item from grn_items where id = v_claim.grn_item_id;

  if p_resolution = 'settled' then
    -- Blinkit pays/credits -> write off disputed units from in_transit
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_claim.org_id, v_grn_item.product_id, 'in_transit', -v_claim.qty, 'writeoff', 'claims', p_claim_id);

    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_claim.org_id, v_grn_item.product_id, 'written_off', v_claim.qty, 'writeoff', 'claims', p_claim_id);

    update claims set status = 'settled', notes = coalesce(notes || ' | ', '') || coalesce(p_notes, 'Settled with credit') where id = p_claim_id;

  elsif p_resolution = 'found' then
    -- Units found and accepted by Blinkit
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_claim.org_id, v_grn_item.product_id, 'in_transit', -v_claim.qty, 'adjustment', 'claims', p_claim_id);

    update grn_items
    set accepted_qty = accepted_qty + v_claim.qty,
        short_qty = greatest(short_qty - v_claim.qty, 0)
    where id = v_grn_item.id;

    update claims set status = 'settled', notes = coalesce(notes || ' | ', '') || 'Found and accepted' where id = p_claim_id;

  elsif p_resolution = 'rejected' then
    -- Claim lost, seller bears loss -> write off from in_transit
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_claim.org_id, v_grn_item.product_id, 'in_transit', -v_claim.qty, 'writeoff', 'claims', p_claim_id);

    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_claim.org_id, v_grn_item.product_id, 'written_off', v_claim.qty, 'writeoff', 'claims', p_claim_id);

    update claims set status = 'rejected', notes = coalesce(notes || ' | ', '') || coalesce(p_notes, 'Claim rejected by channel') where id = p_claim_id;
  end if;
end;
$$;

-- RPC 10: receive_return
create or replace function receive_return(
  p_po_id uuid,
  p_receipt jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_po record;
  v_receipt_id uuid;
  v_item jsonb;
  v_prod_id uuid;
  v_exp integer;
  v_good integer;
  v_dam integer;
  v_miss integer;
  v_rec_date date := coalesce((p_receipt->>'received_date')::date, current_date);
  v_pickup_deadline date := v_rec_date + interval '7 days';
begin
  select * into v_po from purchase_orders where id = p_po_id for update;

  insert into return_receipts (
    org_id, po_id, dn_no, pickup_ticket_no, pickup_deadline, received_date
  ) values (
    v_po.org_id, p_po_id,
    p_receipt->>'dn_no',
    p_receipt->>'pickup_ticket_no',
    v_pickup_deadline,
    v_rec_date
  ) returning id into v_receipt_id;

  for v_item in select * from jsonb_array_elements(p_receipt->'items') loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_exp := (v_item->>'expected_qty')::integer;
    v_good := (v_item->>'good_qty')::integer;
    v_dam := (v_item->>'damaged_qty')::integer;
    v_miss := (v_item->>'missing_qty')::integer;

    if v_good + v_dam + v_miss <> v_exp then
      raise exception 'Constraint check failed: good (%) + damaged (%) + missing (%) must equal expected (%)', v_good, v_dam, v_miss, v_exp;
    end if;

    insert into return_items (
      receipt_id, product_id, expected_qty, received_qty, good_qty, damaged_qty, missing_qty
    ) values (
      v_receipt_id, v_prod_id, v_exp, v_good + v_dam, v_good, v_dam, v_miss
    );

    -- Deduct from return_pending
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
    values (v_po.org_id, v_prod_id, 'return_pending', -v_exp, 'return_good', 'return_receipts', v_receipt_id);

    -- Good stock restored
    if v_good > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_prod_id, 'good', v_good, 'return_good', 'return_receipts', v_receipt_id);
    end if;

    -- Damaged stock
    if v_dam > 0 then
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (v_po.org_id, v_prod_id, 'damaged', v_dam, 'return_damaged', 'return_receipts', v_receipt_id);
    end if;

    -- Missing units create a rejection claim
    if v_miss > 0 then
      insert into claims (
        org_id, po_id, type, qty, status, notes
      ) values (
        v_po.org_id, p_po_id, 'rejection', v_miss, 'open', 'Stock missing from Blinkit return delivery'
      );
    end if;
  end loop;

  -- Auto-allocate returned good units to waiting POs
  perform allocate_waiting_pos(v_po.org_id);

  return v_receipt_id;
end;
$$;


-- =============================================================================
-- SECTION 8: Additional RPC Functions & SuperAdmin Triggers
-- =============================================================================

-- RPC 11: dispose_damaged (PRD 04 - Admin Damaged Stock Disposal)
create or replace function dispose_damaged(
  p_org_id      uuid,
  p_product_id  uuid,
  p_qty         integer,
  p_action      text,       -- 'repaired' | 'returned_to_supplier' | 'discarded'
  p_notes       text,
  p_user_id     uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action not in ('repaired', 'returned_to_supplier', 'discarded') then
    raise exception 'Invalid action: %. Must be repaired, returned_to_supplier, or discarded.', p_action;
  end if;

  if p_qty <= 0 then
    raise exception 'qty must be positive, got %', p_qty;
  end if;

  -- Deduct from damaged bucket
  insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
  values (p_org_id, p_product_id, 'damaged', -p_qty, p_action, 'damaged_stock_actions', p_user_id);

  -- Credit destination bucket
  if p_action = 'repaired' then
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
    values (p_org_id, p_product_id, 'good', p_qty, 'repaired', 'damaged_stock_actions', p_user_id);
    perform allocate_waiting_pos(p_org_id);
  else
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
    values (p_org_id, p_product_id, 'written_off', p_qty, p_action, 'damaged_stock_actions', p_user_id);
  end if;

  insert into damaged_stock_actions (org_id, product_id, qty, action, notes, performed_by)
  values (p_org_id, p_product_id, p_qty, p_action, p_notes, p_user_id);
end;
$$;

-- User Profile Sync Trigger on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, org_id, full_name, role, is_active)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'admin',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Optional PO Expiry Worker (Requires pg_cron extension)
create or replace function expire_overdue_pos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po   record;
  v_item record;
begin
  for v_po in
    select id, org_id
    from purchase_orders
    where valid_till < current_date
      and status not in ('dispatched', 'closed', 'closed_with_claims', 'cancelled', 'expired')
    for update
  loop
    for v_item in
      select * from po_items
      where po_id = v_po.id and reserved_qty > 0
      for update
    loop
      insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, ref_id)
      values (
        v_po.org_id,
        v_item.product_id,
        'reserved',
        -v_item.reserved_qty,
        'release',
        'purchase_orders',
        v_po.id
      );

      update po_items set reserved_qty = 0 where id = v_item.id;
    end loop;

    update purchase_orders set status = 'expired' where id = v_po.id;
  end loop;
end;
$$;

-- =============================================================================
-- VERIFICATION QUERY
-- Run this check to verify all 22+ tables and views are active:
-- =============================================================================
-- select table_name, table_type from information_schema.tables 
-- where table_schema = 'public' order by table_name;
