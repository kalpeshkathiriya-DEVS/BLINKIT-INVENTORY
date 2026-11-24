-- =============================================================================
-- Migration 02: Missing Features & Gap Analysis Fixes
-- Generated: 2024
-- =============================================================================

-- =============================================================================
-- 0. Extend stock_movements.reason check constraint to include disposal reasons
--    (needed for dispose_damaged RPC added in this migration)
-- =============================================================================
alter table stock_movements
  drop constraint if exists stock_movements_reason_check;

alter table stock_movements
  add constraint stock_movements_reason_check
  check (reason in (
    'inward', 'reserve', 'release', 'dispatch', 'grn_short', 'grn_reject',
    'return_good', 'return_damaged', 'adjustment', 'writeoff',
    -- damaged disposal reasons (added in migration 02):
    'repaired', 'returned_to_supplier', 'discarded'
  ));

-- =============================================================================
-- 1. handle_new_user trigger
--    When a new row is inserted in auth.users, automatically create a profile.
--    org_id = null (assigned later by superadmin or org setup flow)
--    full_name from raw_user_meta_data->>'full_name'
--    role = 'admin'
--    is_active = false (must be activated by superadmin)
-- =============================================================================
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

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. Missing RLS enable statements
--    (Some tables may not have had RLS enabled in migration 01)
-- =============================================================================
alter table product_variants   enable row level security;
alter table product_aliases    enable row level security;
alter table channel_locations  enable row level security;
alter table dispatches         enable row level security;
alter table dispatch_items     enable row level security;

-- =============================================================================
-- 3. Plans table (SuperAdmin subscriptions - PRD 09)
-- =============================================================================
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
  on conflict do nothing;
insert into plans values ('pro', 'Pro Plan', 20, 1000, 200, 999, '["all_reports","bulk_upload","barcode_print"]'::jsonb)
  on conflict do nothing;
insert into plans values ('business', 'Business Plan', 100, 10000, 2000, 2999, '["superadmin_support","api_access","custom_branding"]'::jsonb)
  on conflict do nothing;

-- =============================================================================
-- 4. po_import_templates table (column-mapping template persistence)
-- =============================================================================
create table if not exists po_import_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'blinkit',
  column_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table po_import_templates enable row level security;

drop policy if exists "org_isolation" on po_import_templates;
create policy "org_isolation" on po_import_templates
  using (org_id = current_org())
  with check (org_id = current_org());

-- =============================================================================
-- 5. damaged_stock_actions table (PRD 04 - damaged stock disposal tracking)
-- =============================================================================
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

alter table damaged_stock_actions enable row level security;

drop policy if exists "org_isolation" on damaged_stock_actions;
create policy "org_isolation" on damaged_stock_actions
  using (org_id = current_org())
  with check (org_id = current_org());

-- =============================================================================
-- 6. RPC: dispose_damaged
--    Atomic SECURITY DEFINER function for damaged stock disposal.
--    Handles three actions: repaired, returned_to_supplier, discarded.
-- =============================================================================
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
  -- Validate action
  if p_action not in ('repaired', 'returned_to_supplier', 'discarded') then
    raise exception 'Invalid action: %. Must be repaired, returned_to_supplier, or discarded.', p_action;
  end if;

  if p_qty <= 0 then
    raise exception 'qty must be positive, got %', p_qty;
  end if;

  -- Deduct from damaged bucket
  insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
  values (p_org_id, p_product_id, 'damaged', -p_qty, p_action, 'damaged_stock_actions', p_user_id);

  -- Credit the appropriate destination bucket
  if p_action = 'repaired' then
    -- Repaired stock goes back to good
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
    values (p_org_id, p_product_id, 'good', p_qty, 'repaired', 'damaged_stock_actions', p_user_id);
  else
    -- returned_to_supplier or discarded → written_off
    insert into stock_movements (org_id, product_id, bucket, qty, reason, ref_table, user_id)
    values (p_org_id, p_product_id, 'written_off', p_qty, p_action, 'damaged_stock_actions', p_user_id);
  end if;

  -- Audit record in damaged_stock_actions
  insert into damaged_stock_actions (org_id, product_id, qty, action, notes, performed_by)
  values (p_org_id, p_product_id, p_qty, p_action, p_notes, p_user_id);
end;
$$;

-- =============================================================================
-- 7. pg_cron: PO expiry job
--    Requires the pg_cron extension (available on Supabase pro+).
--    expire_overdue_pos() sets expired status and releases reservations.
-- =============================================================================
create extension if not exists pg_cron;

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
    -- Release any reservations for this PO
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

      update po_items
      set reserved_qty = 0
      where id = v_item.id;
    end loop;

    -- Mark PO as expired
    update purchase_orders
    set status = 'expired'
    where id = v_po.id;
  end loop;
end;
$$;

-- Schedule daily at midnight UTC
select cron.schedule('expire-pos', '0 0 * * *', 'select expire_overdue_pos()');

-- =============================================================================
-- 8. Storage buckets
--    Run these in Supabase dashboard > Storage, or via the Management API.
--    They are commented out here to avoid errors when storage schema is unavailable.
-- =============================================================================
-- Note: Run these in Supabase dashboard > Storage, or via API
-- insert into storage.buckets (id, name, public) values ('grn-proofs', 'grn-proofs', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('return-videos', 'return-videos', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('bill-photos', 'bill-photos', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;

-- =============================================================================
-- 9. Audit log RLS policies (supplementary / override)
--    org members can only see their org's log; superadmins see all.
-- =============================================================================
alter table audit_log enable row level security;

drop policy if exists "org_audit_read" on audit_log;
create policy "org_audit_read" on audit_log
  for select
  using (org_id = current_org() or app_current_role() = 'superadmin');

drop policy if exists "org_audit_write" on audit_log;
create policy "org_audit_write" on audit_log
  for insert
  with check (true); -- RPCs insert with service role

-- =============================================================================
-- 10. Missing / replacement RLS policies for core child tables
--     Using simple subquery pattern for clarity and uniform naming.
--     All use "org_isolation" name so they safely replace any prior version.
-- =============================================================================

-- dispatches
drop policy if exists "org_isolation" on dispatches;
create policy "org_isolation" on dispatches
  using (
    po_id in (select id from purchase_orders where org_id = current_org())
  )
  with check (
    po_id in (select id from purchase_orders where org_id = current_org())
  );

-- dispatch_items
drop policy if exists "org_isolation" on dispatch_items;
create policy "org_isolation" on dispatch_items
  using (
    dispatch_id in (
      select id from dispatches
      where po_id in (select id from purchase_orders where org_id = current_org())
    )
  )
  with check (
    dispatch_id in (
      select id from dispatches
      where po_id in (select id from purchase_orders where org_id = current_org())
    )
  );

-- product_variants
drop policy if exists "org_isolation" on product_variants;
create policy "org_isolation" on product_variants
  using (
    product_id in (select id from products where org_id = current_org())
  )
  with check (
    product_id in (select id from products where org_id = current_org())
  );

-- product_aliases
drop policy if exists "org_isolation" on product_aliases;
create policy "org_isolation" on product_aliases
  using (
    product_id in (select id from products where org_id = current_org())
  )
  with check (
    product_id in (select id from products where org_id = current_org())
  );

-- po_items
drop policy if exists "org_isolation" on po_items;
create policy "org_isolation" on po_items
  using (
    po_id in (select id from purchase_orders where org_id = current_org())
  )
  with check (
    po_id in (select id from purchase_orders where org_id = current_org())
  );

-- po_scans
drop policy if exists "org_isolation" on po_scans;
create policy "org_isolation" on po_scans
  using (
    po_item_id in (
      select id from po_items
      where po_id in (select id from purchase_orders where org_id = current_org())
    )
  )
  with check (
    po_item_id in (
      select id from po_items
      where po_id in (select id from purchase_orders where org_id = current_org())
    )
  );

-- inward_items
drop policy if exists "org_isolation" on inward_items;
create policy "org_isolation" on inward_items
  using (
    entry_id in (select id from inward_entries where org_id = current_org())
  )
  with check (
    entry_id in (select id from inward_entries where org_id = current_org())
  );

-- grn_items
drop policy if exists "org_isolation" on grn_items;
create policy "org_isolation" on grn_items
  using (
    grn_id in (select id from grn_entries where org_id = current_org())
  )
  with check (
    grn_id in (select id from grn_entries where org_id = current_org())
  );

-- return_items
drop policy if exists "org_isolation" on return_items;
create policy "org_isolation" on return_items
  using (
    receipt_id in (select id from return_receipts where org_id = current_org())
  )
  with check (
    receipt_id in (select id from return_receipts where org_id = current_org())
  );

-- =============================================================================
-- End of migration 02_missing_features.sql
-- =============================================================================
