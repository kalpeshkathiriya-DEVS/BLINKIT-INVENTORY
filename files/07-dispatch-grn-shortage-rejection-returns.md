# 07 Blinkit GRN, Shortage, Rejection and Returns

## Problem being solved
After dispatch, Blinkit does a **GRN** (Goods Receipt Note) at its warehouse. Often:
- Their labour **misses units**, so GRN quantity is lower than what you sent (**shortage**).
- Some units are **rejected** (damaged, expiry, wrong item, quality) and come **back** to you (**return**).
Your records must always show where every unit is.

## Core concept: three different cases
| Case | Meaning | Physical stock | Money |
|---|---|---|---|
| **Accepted** | Blinkit accepted units | Gone (sold) | Invoice payable |
| **Shortage** | You sent 120, GRN shows 110. 10 not counted | Units are with Blinkit (not back). Stay `in_transit` as **disputed** until resolved | Raise a shortage claim |
| **Rejection** | Blinkit refuses units and returns them | Units come back later. Sit in `return_pending` | Credit note / reduced payment |

Rule: **dispatched = accepted + short + rejected.** The app enforces this on every GRN.

## GRN entry flow (Admin)
1. Open the dispatched PO, click **Enter GRN**.
2. Enter GRN no. and date, then per line: dispatched qty (auto), **accepted qty**, **rejected qty + reason**. Short qty = dispatched - accepted - rejected (auto).
3. Attach the GRN/debit-note PDF or photo.
4. Post via RPC `post_grn`. Ledger:
   - accepted -> removed from in_transit (sold)
   - rejected -> in_transit -> `return_pending`
   - short -> stays in_transit, flagged disputed, creates a **claim** (type shortage)
5. PO status: `grn_pending` -> `closed` when all lines are resolved (or only open claims remain: status `closed_with_claims`).
6. Partial GRNs allowed (Blinkit sometimes does GRN in parts) and multiple GRNs per dispatch.

## Shortage handling
- Claims list: PO, item, short qty, amount (qty x rate), status (open, raised with Blinkit, settled, rejected), notes, evidence files (carton count, weight slip, dispatch scan record).
- Evidence helper: shows "Ravi and Priya scanned 120 on 14 Nov, 5 cartons, LR 123" to support your claim.
- Resolution (Admin picks one):
  - **Blinkit pays / credits** -> claim settled, units written off (reason: shortage settled)
  - **Blinkit later finds the units** -> GRN revision, accepted qty increases
  - **Rejected claim (you bear loss)** -> write off with reason
- Dashboard: shortage % per Blinkit warehouse and per period, so you spot patterns.

## Rejection and return handling
1. Units appear as `return_pending` with expected qty per product.
2. When the goods physically arrive, staff open **Return Receipt** (RPC `receive_return`): per product enter received qty, then split **Good** and **Damaged**, plus missing qty if fewer than expected.
   - Good -> bucket good (sellable again, and auto-allocated to waiting POs if setting on)
   - Damaged -> bucket damaged
   - Missing (expected but not received) -> becomes a claim (type rejection) / write-off after Admin decision
3. Rejection reason report: expiry, damage, wrong item, quality, label issue.
4. Partial return receipts allowed (return arrives in multiple boxes).
5. Aging alert: return pending more than 15 days.

## Return QC scan
Returned goods are scanned by UPC like dispatch, so quantities are proven. Staff choose Good or Damaged per scan batch.

## Vibe-coding prompt
~~~
Build the Blinkit GRN, shortage, rejection and returns module per
07-dispatch-grn-shortage-rejection-returns.md.

Database: use grn_entries, grn_items, claims, return_receipts, return_items and the stock buckets in_transit and return_pending.

RPCs (atomic, org-scoped, audit logged):
- post_grn(po_id, dispatch_id, grn jsonb): validates accepted + rejected <= dispatched, computes short, moves ledger (accepted leaves in_transit; rejected -> return_pending; short flagged disputed) and creates claims for short and rejected-lost units. Supports multiple partial GRNs.
- resolve_claim(claim_id, resolution, notes): settled (write off), found (revise GRN, increase accepted), rejected (write off as loss).
- receive_return(po_id, items jsonb): good -> good bucket, damaged -> damaged bucket, missing -> claim; reduces return_pending; triggers allocate_waiting_pos().

UI (mobile-first):
1. GRN entry screen on a dispatched PO with per-line accepted/rejected/reason and live short calculation, file upload for GRN proof.
2. Claims page with filters, status workflow and an evidence panel pulling scan history (staff names, times, cartons, LR no.).
3. Return Receipt screen with UPC scanning and Good/Damaged toggle per batch.
4. Dashboard cards: open shortage value, return pending units, shortage % by warehouse, top rejection reasons, aging returns > 15 days.
Enforce dispatched = accepted + short + rejected. Write tests for: full accept, partial short, rejection then good+damaged return, return with missing units, and two partial GRNs on one dispatch.
~~~

## Acceptance checklist
- [ ] Sent 120, GRN accepts 110: 10 shown as short claim, stock not magically restored
- [ ] Sent 120, 100 accepted, 15 rejected, 5 short: all buckets add up to 120
- [ ] Return of 15 received as 12 good + 2 damaged + 1 missing updates all buckets and creates a claim for 1
- [ ] Returned good units become available and fill waiting POs
- [ ] Claim evidence shows who scanned and when
