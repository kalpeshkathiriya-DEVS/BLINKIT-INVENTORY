# 05 Blinkit PO Upload and Team Scanning

## Goal
Admin uploads a Blinkit PO; any number of staff scan against it; the app blocks scanning more than requested.

## PO upload
- Upload Excel/CSV/PDF-to-Excel of the Blinkit PO. Parser must be **column-mapping based**: first time, Admin maps columns (item code, item name, qty, rate, PO no., delivery location, valid till); the mapping is saved as a template for next time.
- Match each line to a product via `channel_item_map` (Blinkit item code) or UPC. Unmatched lines are shown in red; Admin links them once (saved as mapping for future).
- Duplicate PO number is blocked.
- PO created with status `new`. Reservation happens next (file 06).

## Scanning screen
- Staff opens a PO from "Open POs" (all staff see all open POs of the org).
- Checklist per line: *Official name, needed 120, scanned 95 (Ravi 60, Priya 35), remaining 25*.
- Camera scan UPC (or Bluetooth scanner / manual quantity entry for items without barcode). Optional multi-quantity button: "scan once, add 12" (for a carton) with Admin setting.
- **Over-scan blocked** by RPC `scan_item`: row lock on po_item, if scanned + qty > requested then reject with beep + red screen.
- Wrong item (UPC not in this PO) = rejected with message.
- Realtime: all phones update instantly (Supabase Realtime on po_items/po_scans).
- Undo: staff can void their own last scan within 2 minutes; Admin can void any. Voids are logged.
- Offline: queue scans locally, sync later; the server still enforces the limit and reports rejected scans.

## Admin view
Per line and per staff breakdown, progress bar, activity timeline, assign optional sections to staff, close dispatch only when all lines complete or Admin accepts a shortfall with a reason.

## Dispatch closing (RPC `close_dispatch`)
Enter invoice no., date, cartons, vehicle/transporter, LR no. Creates `dispatches` + `dispatch_items`; moves stock: reserved -> deducted from good, added to in_transit. Status: dispatched / partly dispatched.

## Vibe-coding prompt
~~~
Build Blinkit PO upload and team scanning per 05-blinkit-po-and-scanning.md.
1. PO upload page with xlsx parsing, saved column-mapping templates, product matching via channel_item_map/UPC, and an unmatched-lines resolver.
2. Open POs list and a PO scanning page using html5-qrcode (rear camera, torch toggle, beep + vibration, red flash on error). Include manual entry for items without barcode.
3. Postgres RPC scan_item(po_item_id, scanned_code, qty) with SELECT ... FOR UPDATE that rejects over-quantity and wrong items, inserts po_scans, updates scanned_qty and returns the new totals.
4. Supabase Realtime subscription so every phone shows live per-staff counts.
5. Void scan (own last scan within 2 minutes; Admin anytime), all audited.
6. Admin PO detail with per-line, per-staff breakdown and a close_dispatch RPC capturing invoice no., cartons, vehicle, LR no.
7. Offline queue (IndexedDB) that syncs and shows which scans were rejected.
Write tests simulating 10 concurrent scans on the last unit: exactly one must succeed.
~~~

## Acceptance checklist
- [ ] 121st scan on a 120 line is rejected
- [ ] Two staff scan one PO and both see live totals
- [ ] Unmatched Blinkit item is flagged, not silently dropped
- [ ] Concurrent scan test passes
- [ ] Closing dispatch with shortfall requires a reason
