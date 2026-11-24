# 01 Database Schema and Security

## Goal
One Postgres schema for all modules, with RLS so each business sees only its own data.

## Tables

**Platform**
- `organizations`: id, name, category (home_kitchen, clothing, manufacturing, other), phone, email, gstin, state, status (pending, active, blocked), plan, created_at
- `profiles`: id (= auth user id), org_id (null for superadmin), full_name, phone, role (superadmin, admin, user), is_active, created_by
- `audit_log`: id, org_id, user_id, table_name, record_id, action, old_data jsonb, new_data jsonb, created_at

**Masters**
- `products`: id, org_id, internal_name, official_name, sku, upc, hsn, mrp, gst_percent, unit, category, rack_location, image_url, is_active
- `product_variants` (clothing): product_id, size, color, upc, sku
- `product_aliases`: product_id, alias, source
- `channel_item_map`: product_id, channel (blinkit, amazon, flipkart...), channel_item_code, channel_item_name
- `suppliers`: id, org_id, name, gstin, phone, state

**Inwards**
- `inward_entries`: id, org_id, supplier_id, doc_type (bill, challan), doc_no, doc_date, vehicle_no, payment_status, bill_photo_url, created_by, created_at. UNIQUE(org_id, supplier_id, doc_no)
- `inward_items`: entry_id, product_id, received_qty, good_qty, damaged_qty, damage_reason, photo_url, rate, rate_includes_gst, gst_percent, taxable_value, cgst, sgst, igst, line_total. CHECK(good_qty + damaged_qty = received_qty)

**Orders and dispatch**
- `purchase_orders`: id, org_id, channel, po_number, po_date, valid_till, delivery_location (Blinkit warehouse), status (new, reserved, in_progress, partly_dispatched, dispatched, grn_pending, closed, cancelled, expired), created_by
- `po_items`: po_id, product_id (nullable until mapped), channel_item_code, item_name, requested_qty, reserved_qty, scanned_qty, dispatched_qty, rate
- `po_scans`: id, po_item_id, user_id, qty, scanned_code, created_at, is_voided
- `dispatches`: id, po_id, invoice_no, invoice_date, cartons, vehicle_no, transporter, lr_no, dispatched_at, created_by
- `dispatch_items`: dispatch_id, po_item_id, qty

**GRN, shortage, rejection, returns**
- `grn_entries`: id, org_id, po_id, dispatch_id, grn_no, grn_date, notes, posted_by
- `grn_items`: grn_id, product_id, dispatched_qty, accepted_qty, short_qty, rejected_qty, rejection_reason
- `claims`: id, org_id, grn_item_id, type (shortage, rejection), qty, amount, status (open, raised, settled, rejected), notes
- `return_receipts`: id, org_id, po_id, grn_id, received_date, received_by
- `return_items`: receipt_id, product_id, expected_qty, received_qty, good_qty, damaged_qty, missing_qty

**Ledger**
- `stock_movements`: id, org_id, product_id, bucket (good, damaged, reserved, in_transit, return_pending, written_off), qty (+/-), reason (inward, reserve, release, dispatch, grn_short, grn_reject, return_good, return_damaged, adjustment, writeoff), ref_table, ref_id, user_id, created_at
- View `stock_summary`: per product, per bucket totals, plus `available = good - reserved`

## RLS pattern
- Helper functions: `current_org()`, `current_role()`.
- Every table: `USING (org_id = current_org())`. Superadmin bypass only on organizations/profiles/subscriptions views.
- Users (staff) cannot write to masters, suppliers, claims, or change PO status.
- Ledger table: INSERT only through RPC (revoke direct insert), no UPDATE/DELETE for anyone.

## Vibe-coding prompt
~~~
Create Supabase SQL migrations for the schema in 01-database-schema.md.
Include: all tables with org_id, foreign keys, CHECK constraints, indexes on (org_id, ...),
helper functions current_org() and current_role(), RLS policies for every table,
a stock_summary view (per product per bucket, plus available = good - reserved),
an audit trigger writing to audit_log, and seed data for one demo org with 5 products.
Revoke direct INSERT/UPDATE/DELETE on stock_movements from authenticated users;
only SECURITY DEFINER RPC functions may write to it.
Then write a SQL test script proving that user A in org 1 cannot read org 2 data
and that a 'user' role cannot edit products.
~~~

## Acceptance checklist
- [ ] Cross-org read/write is impossible
- [ ] Staff cannot edit masters
- [ ] Ledger cannot be edited or deleted
- [ ] good + damaged = received check works
