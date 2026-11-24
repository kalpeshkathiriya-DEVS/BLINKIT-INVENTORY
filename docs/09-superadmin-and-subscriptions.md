# 09 Super Admin and Subscriptions

## Super Admin panel (/super)
- Businesses list: name, category, status, plan, users count, last active
- Approve / block / unblock; create Admin manually; impersonate (view-as) with audit log
- Platform stats: businesses, users, scans per day, storage use
- Plans: Free (e.g. 2 users, 50 products, 10 POs/month), Pro, Business. Limits enforced in RPCs; friendly upgrade message
- Announcements to all businesses
- Category templates: default fields per category (clothing variants, manufacturing lots)

## Vibe-coding prompt
~~~
Build the Super Admin module per 09-superadmin-and-subscriptions.md.
Only role superadmin may access /super and cross-org queries (via SECURITY DEFINER views).
Add plans table and plan limits checked inside create-user, create-product and upload-PO RPCs.
Add a view-as-business mode that is read-only and always writes audit_log.
~~~

## Acceptance checklist
- [ ] Blocked business loses access immediately
- [ ] Plan limits stop the 3rd user on Free plan with a clear message
- [ ] View-as is read-only and logged
