# Deploy your own Quick Dish Ops instance

Quick Dish Ops is **public-source, MIT licensed**. Anyone may clone the source and configure their **own** hosting, domain and database. This repository does not need the original author's private backend. The original project stays under its existing GitHub account; users can create their own forks under the MIT license.

## Option 1: Offline-style local demo (no accounts)

```bash
git clone https://github.com/khurramali42/quick-dish-ops.git
cd quick-dish-ops
bun install --frozen-lockfile
bun run dev
```

Leave `.env` unconfigured. The app then saves fictional data to that browser's localStorage. Use the browser Settings export for backup. It does not synchronize between devices.

## Option 2: Your own authenticated database

1. Clone/fork this repo and create a **new Supabase project under your own account**. No repository-author credentials are needed.
2. Read and run the [owner-scoped database SQL](backend/personal-workspace.md). The schema uses Auth, RLS and a revision-checked save function. Do not use the unrelated `optional-supabase-schema.md` blueprint for this adapter.
3. In Supabase Authentication, enable Email/Password login. Choose whether email confirmation is required.
4. Copy `.env.example` to `.env` locally:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```
   These are **build-time frontend configuration values**, not hidden server-side secrets. Only the publishable key belongs in frontend code; no secret or service-role keys.
5. Run `bun install --frozen-lockfile` and `bun run build`, then `bun run dev` or `bun run start`.
6. Open your instance, register/sign in with an email/password account. The first sign-in creates that account's **private workspace** in your Supabase database. Each account is isolated by its `auth.uid()` via RLS.
7. Test a second account for isolation and a browser refresh for persistence before storing any important test records.

**Hosting:** Build this repository on a platform supporting TanStack Start/Nitro's Node server output. Configure the same `VITE_` variables in your hosting provider's **build environment**, then build and deploy. Point your domain's DNS records to your hosting provider, enable HTTPS, and configure Supabase **Auth → URL Configuration** with your deployed site and allowed redirects. No custom domain is hardcoded in the application.

### Login vs developer credentials

The developer enters the *project URL and publishable key* into their own deployment configuration. Each user enters only their *email and password* on the login screen. End users should never be asked for a database password, admin key, service-role key or SQL connection string.

### Persistence & concurrency

- When backend configuration is present, the application does **not** save customer/financial state to localStorage. Sign-in tokens live only in per-tab sessionStorage. Signing out clears them from that tab.
- Data is auto-saved to the account-owned workspace after changes. Saving is revision-checked; if two tabs modify the same workspace, the stale client blocks editing and offers reload instead of overwriting another tab.
- Changes made moments before closing the tab could be lost during pending network saves. Wait for **Synced** before exiting. There is no offline queue or merge.
- **One authenticated account at a time** is the intended use case. Do not share an account password across devices/staff. This starter does not implement team membership, cashier authorization, verified payment collection, or server-side receipt integrity.
- The hosted `Reset All` demo button is intentionally disabled to prevent accidental destruction of cloud-backed records. Use your own authenticated database administrative workflow.
- Pre-existing browser-local data is **not** silently imported to the new backend. The account starts with isolated example data. Manually review any import/export before using it.

### Public contribution and ownership

The source repository remains owned by its GitHub account holder. The MIT License allows other developers to use, modify, fork, distribute and commercially deploy their copies **subject to the license notice**. Copyright and the upstream repository ownership do not transfer to users merely by cloning the project.

## Important: payment and real restaurants

Payment methods in the app are a **simulation**. A username/password and an RLS-protected JSON row are not substitutes for payment-provider verification, transactional stock allocation, financial permissions or auditing. For business use, a developer must implement and test those backend services independently.

## Troubleshooting

- **Login screen not showing:** both build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be present; rebuild after changing them.
- **Unauthorized / row access:** verify the SQL, Auth account, provider settings and RLS. Do not disable RLS.
- **Not found table/function:** apply [personal-workspace.md](backend/personal-workspace.md) to the same database project and ensure the Data API exposes `public`.
- **Authentication failed:** verify email confirmation and provider email/password settings.
- **Sync blocked:** don't continue editing; reload to load the latest server data, then reapply any unsaved changes.
- **HTTPS:** browsers cannot safely authenticate against plain HTTP remote endpoints. Localhost is allowed for testing only.
