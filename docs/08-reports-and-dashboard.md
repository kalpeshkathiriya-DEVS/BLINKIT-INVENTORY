# 08 Reports and Dashboard

## Dashboard (Admin)
Today: inwards count, units dispatched, open POs, POs expiring soon, shortage value open, returns pending, low stock items.

## Reports (all with date presets Today / Yesterday / Week / Month / Custom, Excel export)
1. **Stock report:** Good, Reserved, Available, Damaged, In transit, Return pending, by product. Valuation at last purchase rate.
2. **Purchase register:** by date, supplier, GST % with CGST/SGST/IGST totals.
3. **Supplier damage report:** received vs damaged %, per supplier per period.
4. **PO fulfilment:** requested vs reserved vs dispatched vs accepted per PO; fill rate %.
5. **GRN report:** accepted, short, rejected per PO and per Blinkit warehouse.
6. **Claims report:** open/settled/lost value.
7. **Returns report:** reasons, good vs damaged recovery %.
8. **Staff report:** scans per staff per day, void count, error count.
9. **Stock ledger:** every movement for a product with filters (the proof trail).
10. **Audit log viewer.**
11. Low-stock and dead-stock (no movement 60/90 days).

## Vibe-coding prompt
~~~
Build dashboard and reports per 08-reports-and-dashboard.md using SQL views/RPCs scoped by org_id.
Each report: date-preset filter, table with sorting, Excel export via xlsx, and a mobile-friendly card layout.
Dashboard cards must be realtime where cheap (Supabase Realtime) and otherwise refresh on focus.
Staff users see only their own activity report; Admin sees everything.
~~~

## Acceptance checklist
- [ ] Stock report equals the sum of the ledger
- [ ] Excel exports open cleanly
- [ ] Staff cannot see other staff's or purchase-rate reports
