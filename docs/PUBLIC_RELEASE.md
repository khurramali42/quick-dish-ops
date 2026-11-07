# Public source release and production backend roadmap

## What users can run now

Quick Dish Ops is an **open-source, browser-local restaurant POS demonstration**.
Clone, install with Bun, run `bun test`, `bun run build`, then `bun run dev`.
Users can explore the app without a database or secrets. Food, customer, sales and
payment records are simulated locally; **do not enter real customer or card data**.

The latest demo now includes:
- A supplier purchase-payable ledger with recorded partial settlements.
- Ingredient recipes which can deduct tracked ingredient units on checkout.
- Inventory waste entries with reason and local activity history.
- Previously implemented local reservations, kitchen states, checkout, and JSON backups.

These are local workflow implementations. A public repository is **not** the same
as a public production service.

## Optional SQL backend foundation

A starting PostgreSQL schema with tenant IDs, authenticated organization
membership and restrictive RLS policies is located at
[`docs/backend/optional-supabase-schema.md`](backend/optional-supabase-schema.md).

**The SQL is an integration blueprint, not an active migration.** It is not
connected to the current browser app and has not been deployed or security-audited
on an actual Supabase project. It intentionally provides no direct browser
write permissions to orders, payments, inventory or audit events.

For a production implementation, the integrator must:

1. Create a dedicated database, apply and test schema migrations in a staging
   project, and review RLS policies for all authenticated/anonymous roles.
2. Implement Supabase Auth (or another supported identity provider) with
   organization membership, owner/manager/cashier/kitchen roles and securely
   provisioned staff accounts. Never trust client-edited user metadata for roles.
3. Replace the browser-local Zustand authority with a backend API and read-only
   client state cache. All sales, refunds, inventory deductions and supplier
   settlements must be atomic server-side transactions using idempotency keys.
4. Use the payment provider's **server-verified** payment transaction status.
   Do not consider a client-submitted `paid` number evidence of collection.
   Never commit merchant secrets or payment signing keys.
5. Make all reservation/seat state changes transactional and lock conflicts;
   prevent double reservations across devices.
6. Validate real kitchen dispatch and settlement transitions against authenticated
   roles; decide when food should be prepared before payment, and handle cancellations.
7. Add secured external backups, restoration drills, retention limits, privacy
   controls and tamper-resistant, server-generated audit records.
8. Run integration tests against two concurrently logged-in users and two
   organizations, including attempted cross-tenant reads/writes, payment retries,
   double-bookings, refunds and network interruption.

Supabase reference docs:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/quickstarts/react

Do **not** put service-role keys in `VITE_` variables. Only safe publishable
keys may be exposed to browser code, and RLS must enforce tenant permissions.
The published browser demo must not claim real staff authentication, payments
or multi-device synchronization.

## Remaining demo limitations

- Staff names are labels, not authenticated identities; local activity events
  can be modified by browser users and are not a secure audit trail.
- No real multi-user synchronization, payment gateway, restaurant-grade
  accounting ledger, per-table settlement or printer certification.
- Inventory recipes work with quantities as configured and can use fractional
  units. Configure actual inventory unit conventions before operational use.
- Supplier settlement entries record bookkeeping only, not external transfers.
- Existing receipt/tax formats are examples; actual tax/legal compliance varies.

## Release checklist

- [ ] Use fictional example data for screenshots.
- [ ] Keep `.env`, service secrets, customer exports and database dumps out of Git.
- [ ] Run `bun test` and `bun run build` and review GitHub Actions status.
- [ ] Review the MIT license, dependency licenses and photo attribution notices.
- [ ] Keep SECURITY.md and contributing instructions accessible.
- [ ] Mark README as demo and refrain from describing payment simulations as real.
- [ ] For hosted deployment, complete the backend/auth requirements above first.
