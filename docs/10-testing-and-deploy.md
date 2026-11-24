# 10 Testing and Go-Live

## Must-pass scenarios (end to end, Blinkit)
1. Inward 100 units (92 good, 8 damaged). Stock: good 92, damaged 8.
2. Upload Blinkit PO for 120. Reserve: 92 reserved, 28 short flagged. Inward 40 more: auto-reserves the remaining 28.
3. Ravi and Priya scan 60 each from two phones. 121st scan rejected.
4. Close dispatch with invoice, cartons, LR. Stock: good decreases, in_transit 120.
5. Blinkit GRN: accepted 100, rejected 15, short 5. Claim created for 5; 15 in return_pending.
6. Return arrives: 12 good, 2 damaged, 1 missing. Buckets and claims update; 12 good available again.
7. Resolve the shortage claim as settled. Ledger sums reconcile to zero difference.
8. Try cross-business access with a second org. Must fail.

## Go-live checklist
- [ ] RLS enabled on every table (run a check query)
- [ ] Service role key only on the server
- [ ] Daily database backup enabled; test a restore
- [ ] HTTPS, PWA install tested on Android
- [ ] Camera permission and low-light scanning tested on cheap phones
- [ ] Privacy policy and terms page (needed when selling to other businesses)
- [ ] Pilot with your own warehouse for 2 weeks before onboarding others

## Vibe-coding prompt
~~~
Write automated tests (SQL + Playwright) for the 8 scenarios in 10-testing-and-deploy.md.
Add a reconciliation SQL check: for each product, ledger total per bucket must equal the stock_summary view, and
dispatched = accepted + short + rejected for every GRN. Fail loudly if any check breaks.
Then prepare Vercel and Supabase deployment steps and an environment variable checklist.
~~~
