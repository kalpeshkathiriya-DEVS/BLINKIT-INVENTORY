# Inventory App: Vibe Coding Pack

Multi-business inventory app for Blinkit / e-commerce sellers (India).
Stack: Next.js (PWA) + Supabase (Postgres, Auth, Realtime, RLS) + Tailwind + Vercel (all free tier to start).

## How to use this pack
1. Open your AI coding tool (Claude Code, Cursor, Lovable, Bolt, etc.).
2. Paste **00-master-rules.md** first. Keep it in the project as `docs/` so the AI re-reads it.
3. Build in order below. For each step: paste the file's **Vibe-coding prompt**, test, then move on.
4. After each step ask the AI: "Run through the acceptance checklist in this file and tell me what fails."

## Build order
| Step | File | What you get |
|---|---|---|
| 0 | 00-master-rules.md | Stack, conventions, golden rules |
| 1 | 01-database-schema.md | Full database + security |
| 2 | 02-auth-roles-organizations.md | Super Admin / Admin / User, registration |
| 3 | 03-product-master.md | Two names, UPC, HSN, MRP, Blinkit mapping |
| 4 | 04-inwards.md | Bill, firm, rate, GST, damaged |
| 5 | 05-blinkit-po-and-scanning.md | PO upload, team scanning, quantity lock |
| 6 | 06-stock-reservation.md | Reserve stock per PO |
| 7 | 07-dispatch-grn-shortage-rejection-returns.md | GRN, shortage, rejection, returns |
| 8 | 08-reports-and-dashboard.md | Stock, GRN, supplier, staff reports |
| 9 | 09-superadmin-and-subscriptions.md | Multi-business control |
| 10 | 10-testing-and-deploy.md | Test scenarios and go-live |

Do NOT skip steps 1 to 3. Everything else depends on them.
