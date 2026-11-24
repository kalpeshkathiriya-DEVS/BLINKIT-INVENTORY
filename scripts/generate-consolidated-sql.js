const fs = require('fs');
const path = require('path');

const file01 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/01_initial_schema.sql'), 'utf8');
const file02 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/02_missing_features.sql'), 'utf8');

// Build the consolidated master migration
let fullSql = `-- =============================================================================
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

`;

// 1. Organizations & Profiles & Helper Functions
fullSql += `-- =============================================================================
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

`;

// 2. Product Master, Channels & Suppliers
fullSql += `-- =============================================================================
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

`;

// 3. Purchase Orders, Scanning, Dispatches, Inwards, GRNs, Claims, Returns
fullSql += `-- =============================================================================
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

`;

// 4. Stock Summary View
fullSql += `-- =============================================================================
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

`;

// 5. Row Level Security
fullSql += `-- =============================================================================
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

`;

// Extract RPC functions from 01_initial_schema.sql
const rpcStartIdx = file01.indexOf('-- 10. Atomic Critical RPC Functions');
if (rpcStartIdx !== -1) {
  fullSql += file01.slice(rpcStartIdx);
} else {
  console.error('Could not find RPC section in 01_initial_schema.sql');
}

// Append dispose_damaged, handle_new_user, and expire_overdue_pos
fullSql += `

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
`;

fs.writeFileSync(path.join(__dirname, '../supabase/migrations/FULL_DATABASE_SETUP.sql'), fullSql, 'utf8');
console.log('Successfully generated supabase/migrations/FULL_DATABASE_SETUP.sql (bytes:', fullSql.length, 'lines:', fullSql.split('\n').length, ')');
