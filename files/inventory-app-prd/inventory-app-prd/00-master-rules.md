# 00 Master Rules (paste first, keep in project)

## Product
A multi-tenant inventory app for sellers on Blinkit and other e-commerce channels. Many businesses use it; each sees only its own data. Phase 1 focus is Blinkit: inwards, PO reservation, scan-based dispatch, GRN, shortages, rejections, returns.

## Stack
- Next.js (App Router, TypeScript), Tailwind, installable PWA, mobile-first
- Supabase: Postgres, Auth, Realtime, Row Level Security, RPC functions
- `html5-qrcode` for camera scanning; `xlsx` (SheetJS) for Excel/CSV import and export
- Hosting: Vercel. Timezone: Asia/Kolkata. Currency: INR.

## Golden rules (the AI must follow these always)
1. **Multi-tenant:** every table has `org_id`. RLS on every table. A user can never read or write another org's rows.
2. **Roles:** `superadmin`, `admin`, `user`. Enforced in RLS and RPC functions, not just the UI.
3. **Ledger, not overwrite:** stock is never edited directly. Every change is a row in `stock_movements`. Current stock = sum of movements.
4. **Atomic critical actions:** scanning, reservation, GRN posting and returns run as Postgres RPC functions in a single transaction with row locking, so concurrent users cannot over-scan or oversell.
5. **Server time:** all timestamps use database `now()` (IST display). Staff cannot set dates. Only Admin can back-date, and it is logged.
6. **Audit log:** every create/update/delete of important records writes to `audit_log` (who, what, old, new, when).
7. **Staff never type free text for products.** They select from the product master or scan.
8. **Soft delete only** (`is_active`/`deleted_at`). No hard deletes of business records.
9. **Mobile first:** big buttons, scan screen usable one-handed, sound + vibration feedback on scan success/error.
10. **Plain language errors**, e.g. "Over quantity: PO needs 120, already scanned 120."
11. Money in numeric(12,2). Quantities in integers (pcs) unless the unit is kg/litre (numeric(12,3)).

## Stock buckets (core concept)
| Bucket | Meaning |
|---|---|
| good | Sellable physical stock in warehouse |
| reserved | Part of good stock promised to an open PO (derived, not physical) |
| damaged | Damaged, not sellable |
| in_transit | Dispatched to Blinkit, GRN not done yet |
| return_pending | Blinkit rejected/returned, not yet physically received back |
| written_off | Lost, discarded, or returned to supplier |

**Available to promise = good - reserved.**

## Prompt for the AI tool
~~~
You are building a multi-tenant inventory SaaS for Indian e-commerce sellers (Blinkit first).
Read the rules above and follow them strictly. Work step by step: I will give you one module
at a time. For each module: (1) create/modify the database migrations, (2) RLS policies,
(3) RPC functions for critical actions, (4) UI pages, (5) a short test checklist.
Never skip RLS. Never update stock by editing a number; always insert stock_movements.
Ask me before changing anything from an earlier module. Confirm you understood, then wait.
~~~
