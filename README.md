# Quick Dish Ops

**Open-source, self-hostable restaurant POS starter.** Clone this project, connect your own database and hosting domain, and customize its source. No original-author backend credentials are required.

[![Build and tests](https://github.com/khurramali42/quick-dish-ops/actions/workflows/build.yml/badge.svg)](https://github.com/khurramali42/quick-dish-ops/actions/workflows/build.yml)
[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Two modes:** No credentials gives the original browser-local demo. With your own Supabase project URL and publishable key, email/password accounts can save an owner-isolated workspace. This is **not** a multi-staff transactional financial backend or a real payment gateway. Use demo data until you independently verify production requirements.

## Application screenshots

Real Chromium screenshots captured from the **current built application**, using fictional local demo records. No design mockups or synthetic UI screenshots are substituted.

| Dashboard | Cashier / POS |
| --- | --- |
| ![Latest dashboard with demo sales](docs/screenshots/dashboard.png) | ![Latest cashier and compact product cards](docs/screenshots/pos.png) |

| Kitchen display | Tables and reservations |
| --- | --- |
| ![Queued, preparing and ready kitchen Kanban](docs/screenshots/kitchen.png) | ![Table booking and restaurant floor](docs/screenshots/tables.png) |

| Orders | Inventory |
| --- | --- |
| ![Order history](docs/screenshots/orders.png) | ![Inventory and recipe management](docs/screenshots/inventory.png) |

| Menu products | Supplier purchases |
| --- | --- |
| ![Product and menu management](docs/screenshots/products.png) | ![Purchase invoices and supplier settlement](docs/screenshots/purchases.png) |

| Settings | Mobile POS |
| --- | --- |
| ![Settings and demo operator](docs/screenshots/settings.png) | ![Responsive mobile cashier menu](docs/screenshots/mobile-pos.png) |

![Responsive mobile order cart and totals](docs/screenshots/mobile-cart.png)

To regenerate these screenshots from the latest source, use the [Capture current application screenshots](.github/workflows/capture-screenshots.yml) workflow. Pull requests receive preview artifacts; after the workflow changes merge to `main`, its capture job can publish the updated PNG files. Only fictional browser-local data is used.

## What you can explore

- **POS:** menu and category browsing, item search, cart, discounts, tax, checkout simulation and receipt preview/printing with 58mm, 80mm or A4 options
- **Orders and kitchen:** order history, demo-only refund review and a local kitchen board with New → Preparing → Ready → Served; unpaid cart tickets can be sent to the local kitchen queue before checkout
- **Products and inventory:** categories, images, stock, ingredient recipes and reason-coded waste adjustments
- **Purchasing:** supplier records, incoming stock, partial supplier invoice settlements and expense entries
- **Customers and reports:** example customer records, basic sales summaries and financial snapshots
- **Persistence:** original browser-local demo or own-Supabase per-account workspace with email login and revision-checked autosaves; JSON backup/export remains available.

Some interfaces represent **simulated processes**, not integrations with payment terminals, accounting software, card networks or external kitchen displays.

## Self-host your own backend and domain

Follow the **[Self-hosting and credentials guide](docs/SELF_HOSTING.md)**. Developers set their own Supabase project URL and publishable key using [`.env.example`](.env.example), and apply the [owner-scoped database setup](docs/backend/personal-workspace.md). End users sign in with email/password. The project can be hosted on a compatible Node/Nitro platform and accessed through a custom domain.

The upstream GitHub repository stays with its current owner. The MIT License permits other developers to clone, fork and deploy their own copies under its license terms.

## Run locally

**Requirements:** [Bun](https://bun.sh/) and a current, supported Node.js release. Git is required to clone the project.

```bash
git clone https://github.com/khurramali42/quick-dish-ops.git
cd quick-dish-ops
bun install --frozen-lockfile
bun run dev
```

Open the local URL shown in the terminal, usually **http://localhost:5173**. No credentials are required for demo mode. For private database persistence, follow [SELF_HOSTING.md](docs/SELF_HOSTING.md) before building.

### Tests and local build

```bash
bun test
bun run build
```

To run the built app locally, use `bun run start`. Browser-only functional tests are in `tests/`; GitHub Actions runs build, checkout and data-integrity checks. Manual screenshot and browser-test workflows are available for maintainers.

## Project map

| Path | Purpose |
| --- | --- |
| `src/routes/` | POS, dashboard, kitchen, inventory, orders, products and reports |
| `src/components/` | Shared UI, sidebar and printable receipt |
| `src/lib/store.ts` | Zustand state, browser persistence and demo operations |
| `src/lib/seed.ts` | Fictional restaurant catalog and starter data |
| `src/lib/types.ts` | Data models |
| `tests/` | Checkout, stock, kitchen, receipt and viewport checks |
| `docs/screenshots/` | Actual interface screenshots |

**Stack:** React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, Zustand, Bun and Nitro.

## Cross-module audit

See [cross-module integrity and settings audit (2026-11-07)](docs/cross-module-audit-2026-11-07.md) for current relationships, tested fixes, and the remaining production gaps.

## Public repository release

See [public release guide](docs/PUBLIC_RELEASE.md) for usable demo features, license/screenshot checks, and optional secure database architecture. **This project is public-source software, not a hosted multi-tenant restaurant service.**

## Before using this for a real restaurant

This code is a starting point for development, **not a commercially certified POS**. The optional backend stores an owner's JSON workspace, not server-authorized financial transactions. A real deployment would need secured authentication and roles, a central transactional database, reliable backups, audit trails, privacy controls, server-side inventory and payment validation, hardware/printer testing, multi-device concurrency and jurisdiction-specific tax review. Browser storage cannot safely replace those systems.

## Contributing and licensing

Contributions and bug reports are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and the GitHub issue template. Do not submit live customer data or credentials.

Distributed under the [MIT License](LICENSE), subject to third-party rights and [attribution notices](THIRD_PARTY_NOTICES.md). The project's historical commits preserve its original development provenance.

**This repository is shared for source-code review and local use. Public web hosting is intentionally not being promoted.**
