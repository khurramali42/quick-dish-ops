# Spice Kitchen POS

A restaurant and cafe point-of-sale interface built with React, TanStack Start, Vite and TypeScript.

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
