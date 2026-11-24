# 04 Inwards (Purchase Receiving)

## Goal
Record goods received from suppliers with bill details, rate, GST and damage, and put good stock into the ledger.

## Bill header (once per entry)
- Supplier / firm (select from suppliers; add new inline with GSTIN, phone, state)
- Document type: Bill or Challan, and number
- Bill date (default today; only Admin may change)
- Optional: vehicle no., payment status, bill photo

## Line items
Product (search by any name), Received, Good, Damaged (enforce good + damaged = received), damage reason + photo when damaged > 0, purchase rate, rate includes GST toggle, GST % (prefilled from product master).
Auto-calc: taxable value, CGST/SGST (same state as supplier GSTIN) or IGST, line total, bill total.

## Smart checks
- Duplicate block: same supplier + same bill no.
- Rate change warning vs last purchase rate
- Bill total shown to compare with the paper bill
- Damaged value is recorded so a supplier credit note can be claimed

## Stock effect (via RPC `post_inward`)
- good_qty -> `stock_movements` bucket good, reason inward
- damaged_qty -> bucket damaged, reason inward
- Whole entry saved in one transaction

## Damaged stock handling (Admin)
Move damaged units to: repaired -> good, returned to supplier -> written_off, discarded -> written_off. Each action logged with reason.

## Vibe-coding prompt
~~~
Build the Inwards module per 04-inwards.md.
- Mobile-first multi-line form with supplier select, bill/challan no, date (default today), and product lines using the global product search.
- Live validation good + damaged = received; auto GST calculation with CGST/SGST vs IGST based on supplier state vs org state.
- Create Postgres RPC post_inward(entry jsonb) that inserts inward_entry, inward_items and stock_movements (good and damaged buckets) atomically and rejects duplicate (supplier, doc_no).
- Inward list page with filters (today, week, month, supplier) and a detail page; Admin-only edit of a posted entry creates reversing movements, never overwrites.
- Damaged stock page where Admin moves units to good / returned to supplier / discarded with a reason.
- Hide purchase rate fields from staff if the org setting hide_rates_from_staff is on.
~~~

## Acceptance checklist
- [ ] 100 received = 92 good + 8 damaged adds 92 to good, 8 to damaged
- [ ] Same bill number from same supplier is rejected
- [ ] GST split correct for intra-state vs inter-state
- [ ] Editing a posted bill leaves a reversal trail
