# 06 Stock Reservation

## Goal
When a PO arrives, hold the needed units so they cannot be promised to another PO or channel. Prevent overselling.

## Rules
- **Available to promise = good - reserved.**
- When PO is created/approved, RPC `reserve_po(po_id)` reserves `requested_qty` per line, limited by available stock.
- If stock is short, the line is partly reserved; the PO shows **shortfall** (needed 120, reserved 80, short 40) and status `new` with a "short stock" badge. Admin choices: wait for inwards, accept partial, or cancel the line.
- **Auto-allocation:** when new inwards arrive, a button (or automatic setting) reserves for oldest open POs first (FIFO by PO date / valid_till).
- **Release** reserved stock when: PO cancelled, PO expired (valid_till passed, daily job), line quantity reduced, or Admin manually releases with reason.
- **Dispatch** consumes reservation: scanned units move reserved -> dispatched (stock leaves good bucket).
- A staff scan cannot exceed reserved qty on a line, so you can never ship unreserved stock (Admin override possible with reason).
- Reservation changes are ledger rows (`reason = reserve / release`), never silent number edits.

## Screens
- Stock page columns: Good, Reserved, Available, Damaged, In transit, Return pending.
- PO page: requested / reserved / short per line, "Reserve now" and "Release" buttons for Admin.
- Alert: POs with shortfall, POs expiring in 24 hours.

## Vibe-coding prompt
~~~
Build stock reservation per 06-stock-reservation.md.
- RPC reserve_po(po_id): locks stock rows per product, reserves min(requested, available), writes stock_movements (bucket reserved, reason reserve), updates po_items.reserved_qty, returns shortfall per line.
- RPC release_po(po_id or line, reason) and a scheduled Supabase cron job that expires POs past valid_till and releases their reservation.
- RPC allocate_waiting_pos() that, after an inward is posted, reserves stock for open POs in order of PO date.
- Update scan_item so scanned_qty cannot exceed reserved_qty (Admin override with reason).
- Update close_dispatch to convert reserved -> deducted from good and add to in_transit.
- Update stock_summary view and the Stock page to show Good, Reserved, Available, Damaged, In transit, Return pending.
- Dashboard widgets: POs with shortfall, POs expiring soon.
Include SQL tests: two POs competing for 100 units of stock must never reserve more than 100 in total.
~~~

## Acceptance checklist
- [ ] Two POs competing for the same stock never exceed available
- [ ] Cancelling a PO returns reserved units to available
- [ ] Expired PO releases reservation automatically
- [ ] New inward auto-fills waiting POs (if setting on)
