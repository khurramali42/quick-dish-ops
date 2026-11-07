# Cross-module integrity and settings audit
**Reviewed:** 2026-11-07  
**Scope:** Quick Dish Ops React/Zustand browser-local demo. Source review plus GitHub build, unit and Chromium viewport/integration checks. This is not a penetration test, production certification or multi-user concurrency test.

## Relationship matrix

| Related systems | Current behavior after this audit | Remaining limits |
|---|---|---|
| POS → Orders → Receipt | Checkout writes sale, payment amount, item snapshot and print view | No real payment gateway, staff authorization or server transaction |
| POS → Inventory | Tracked finished-product units decrement on checkout | No ingredient/recipe/batch inventory; local-only stock is not synchronized |
| Refund → Sales/Customer | Financial sale excluded from totals; loyalty/spend adjusted | Refund does **not** return prepared/consumed kitchen goods to stock. Manual physical-stock correction required. No refund audit authorization |
| POS → Kitchen | Checkout creates kitchen ticket; server-independent status progression validated | Cannot dispatch unpaid tickets to kitchen, no cross-device syncing, no dispatch receipt timestamps |
| Kitchen → Preparation | Ordered stage transitions with preparation item checklist and assigned station | No real chef accounts, completion timestamps or device sync |
| Tables → Booking → POS | Booking checks capacity, overlap and active table; selection can launch dine-in order | No reservation ID attached to sale, no auto-release of table or coordinated multi-user booking |
| Purchases → Products → Suppliers | Incoming stock recorded; partial purchase payments increase supplier payable balance | No supplier-payment settlement screen, opening balance ledger or weighted-average costing |
| Products ↔ Categories | Cannot delete category while products reference it | No soft-delete/archival capability for all record types |
| Products/Customers/Suppliers ↔ History | Referenced IDs protected from destructive deletion | No organization-wide role checks or audit log |
| Settings → POS/Receipts | Business/branch names, service charge, currency and receipt settings used; default product tax assigned on new product | Existing products keep their own tax rate; tax law and payment methods not certified |
| Settings → Backup | v2 exports sales, catalog, suppliers, tables, reservations, active/parked orders, cart and demo operator | JSON is local, unencrypted, manually retained and not transactionally imported from a trusted server |
| Orders → Reports/Dashboard | New sales capture unit cost for historical estimated profit | Older orders without cost snapshots fall back to current product cost; discounts/taxes/ingredient cost are approximate |
| Profile → Operators | Editable demo cashier display name | **No login, passwords, role checks, staff sessions or actual authentication** |

## Confirmed issues corrected in this audit PR

1. Supplier purchase balance did not follow unpaid supplier invoices. Part-paid purchases now add their outstanding balance to the selected supplier; Purchase UI exposes paid amount and payable.
2. Sales history was vulnerable to retroactive profit changes when product cost changed. New checkout records now store unit-cost snapshots, and reports/dashboard use them.
3. Deletions could silently orphan historical references. Store-level guards and UI errors protect linked products, categories, suppliers and customers.
4. Kitchen status could be skipped programmatically. Ordered transitions now block premature ready/served state.
5. Additional units added to a percentage-discounted line did not recalculate the percentage. Cart logic now preserves the correct amount.
6. Refunds of cooked food silently increased finished-product stock. Financial refunds no longer imply physical stock return.
7. Backup excluded reservations, restaurant tables and held orders. Backup v2 covers linked data and the local cart, with limited legacy v1 restore support.
8. Profile was a static name. Settings now offers a clearly labeled **demo operator display name** without pretending it is authenticated.
9. Settings tax default was not applied to new products. New product forms now initialize from the current default.
10. Money formatter displayed no fractions, hiding decimal portions of tax or discounts. It now displays up to two decimal places as needed.

## Open requirements and risks

### Critical for real restaurant deployment
- Central transactional database and multi-device synchronization. Browser localStorage offers neither concurrency control nor durability.
- Real staff identity, secure login, authorization roles (cashier / manager / kitchen), immutable audit events and protected refund/discount administration.
- Payment-provider integration with transaction reconciliation, idempotency, printer and offline-failure testing. Current checkout simulates payment.
- Real backups with restore verification, encryption at rest, secure retention and privacy controls. Exported JSON may contain customer details.

### High
- Kitchen dispatch **before** payment with proper order lifecycle and table bill settlement (current completed-order model starts at payment).
- Reliable reservation/table occupancy/order linkage with unique reservation IDs and explicit close/transfer operations.
- Supplier settlement, accounts-payable journal, stock receiving adjustments and vendor payment history; supplier balance can still be manually edited.
- Ingredient/recipe-level stock consumption, inventory waste/spoilage and cost accounting (finished-product stock only).
- Refund/return approvals and explicit stock disposition (return to sellable stock versus discard).

### Medium
- Historical category revenue should reflect historical category assignments and allocate bill-wide discounts; current chart uses product's present category and gross item price.
- Existing products' tax rates are not retroactively changed by the global default, intentionally; owners must review per-item tax.
- Older orders lack frozen unit-cost snapshots and therefore retain estimated profit based on present product master costs.
- Restore validation checks required shape/links but does not provide cryptographic authenticity or a full DB-style schema migration.
- Current cashier, category and business labels are demo metadata, not an employee management system.

## Audit commands and CI

- `bun install --frozen-lockfile`
- `bun test`
- `bun run build`
- Playwright on production build across desktop, tablet, mobile; checkout, kitchen lifecycle and reservation creation.

**Status:** Audit changes require successful CI before merge. Do not use this code with actual customer/financial records.
