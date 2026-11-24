# 02 Auth, Roles and Organizations

## Goal
Super Admin (you) controls businesses; each business Admin creates its own staff.

## Roles
| Role | Powers |
|---|---|
| Super Admin | See/approve/block all businesses, create Admins, platform stats |
| Admin | Staff management, masters, upload POs, reserve, close dispatch, GRN, claims, reports, back-date |
| User (staff) | Inwards entry, scan on open POs, record return checks. Cannot edit masters, cancel POs, see purchase rates (Admin toggle) |

## Flows
1. **Registration:** business name, owner name, phone, email, password, **category** (Home & Kitchen, Clothing, Manufacturing, Other). Status = pending.
2. **Approval:** Super Admin approves, owner becomes Admin. (Setting for instant approval later.)
3. **Staff creation:** Admin adds name, phone, 4 to 6 digit PIN or password, active toggle. Staff log in with phone + PIN. Admin can deactivate or reset PIN.
4. Every scan and action stores the **staff name**; the UI shows names (e.g. "Ravi 60, Priya 35").
5. Category drives forms: Clothing shows variants (size/colour), Manufacturing shows raw material lots.

## Screens
Login, Register, Pending approval notice, Admin: Staff list/add/edit, Profile, Super Admin: businesses list (see file 09).

## Vibe-coding prompt
~~~
Implement auth and roles using Supabase Auth.
- Registration page asking business name, owner, phone, email, password and category.
  Creates organization (status pending) and profile (role admin, inactive until approved).
- Login with phone/email + password; staff can use phone + PIN (map phone to a synthetic email internally).
- Role-based routing: superadmin -> /super, admin -> /admin, user -> /scan home.
- Admin page to create, deactivate and reset PIN for staff (use a server action with the service role key; never expose it to the client).
- Block login for inactive users and for organizations with status blocked/pending, with a clear message.
- Show the logged-in staff name in the header on every page.
Follow RLS rules from 01-database-schema.md. Include a middleware that protects routes by role.
~~~

## Acceptance checklist
- [ ] Pending business cannot log in until approved
- [ ] Staff created by Admin A cannot appear to Admin B
- [ ] Deactivated staff is logged out and blocked
- [ ] Role routes cannot be opened by URL guessing
