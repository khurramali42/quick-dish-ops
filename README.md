# Spice Kitchen POS

A restaurant and cafe point-of-sale interface built with React, TanStack Start, Vite and TypeScript.

## Application screenshots

Captured from the running application in headless Chromium at desktop resolution, using fictional sample data.

### Dashboard

![Spice Kitchen POS dashboard](docs/screenshots/dashboard.png)

### Point of sale

![Spice Kitchen POS ordering and checkout interface](docs/screenshots/pos.png)

### Orders

![Spice Kitchen POS orders screen](docs/screenshots/orders.png)

## Features

- Point of sale, cart, checkout and receipts
- Orders and kitchen operations
- Products, categories and inventory
- Customers, suppliers, purchases and expenses
- Reports and business settings

## Run locally

Requires Bun and a current Node.js runtime.

```bash
bun install
bun run dev
```

Open the local address printed by Vite.

For a production build:

```bash
bun run build
bun run start
```

## Important data and deployment limitations

This app currently uses browser-side persistent storage for its operational records and includes fictional sample data. It does **not** provide a shared database, multiple-user synchronization, robust user authentication, audit-proof payment ledger or automated cloud backups. Clearing browser storage can lose records. Test with synthetic data; do not use it as a real payment/accounting system until those features are implemented and independently verified.

The default UI identity is **Spice Kitchen POS**, and the example restaurant details can be edited in Settings. The tab icon is a standalone SVG stored at `public/favicon.svg`.

## Automated verification

The GitHub Actions build verifies the independent application compilation, checkout integrity tests, and real browser screenshots. See [the build workflow](.github/workflows/build.yml) and [screenshot workflow](.github/workflows/capture-screenshots.yml). The screenshots are documentation, not evidence of production-grade database security.

