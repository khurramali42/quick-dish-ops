# Own Supabase database: one private workspace per account

This optional setup is for developers who clone this repository and operate **their own** Supabase project. The application does not connect to the repository author's database. Run the SQL below in **your project's SQL editor** after reviewing it.

**Data model:** Each authenticated account has its own JSON workspace. This is a simple per-account hosting path, not a server-validated multi-staff financial ledger. Do not give a team a shared password. The browser POS still uses demonstration payment methods rather than a payment processor.

```sql
create table if not exists public.pos_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.pos_workspaces enable row level security;

revoke all on table public.pos_workspaces from anon;
grant select, insert, update on table public.pos_workspaces to authenticated;

create policy "workspace_owner_read"
on public.pos_workspaces for select to authenticated
using (owner_id = (select auth.uid()));

create policy "workspace_owner_create"
on public.pos_workspaces for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "workspace_owner_update"
on public.pos_workspaces for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create or replace function public.update_pos_workspace(
  expected_revision bigint,
  next_data jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare next_revision bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(next_data) is distinct from 'object'
     or jsonb_typeof(next_data -> 'products') is distinct from 'array'
     or jsonb_typeof(next_data -> 'orders') is distinct from 'array' then
    raise exception 'Invalid workspace document';
  end if;

  update public.pos_workspaces
    set data = next_data,
        revision = revision + 1,
        updated_at = now()
    where owner_id = (select auth.uid())
      and revision = expected_revision
    returning revision into next_revision;

  if next_revision is null then
    raise exception 'Workspace revision conflict; reload your account data';
  end if;

  return next_revision;
end
$$;

-- Postgres grants EXECUTE on functions to PUBLIC by default.
revoke all on function public.update_pos_workspace(bigint, jsonb) from public, anon;
grant execute on function public.update_pos_workspace(bigint, jsonb) to authenticated;
```

## Verify before using it

1. Enable email/password in Supabase **Authentication → Providers**. If email confirmations are enabled, new accounts must confirm email.
2. Check **API settings** to ensure the `public` schema is exposed to your project's REST Data API.
3. In **Settings → API Keys**, use the **publishable** key. Never paste a `service_role` JWT or `sb_secret_...` key into client environment variables.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as described in [SELF_HOSTING.md](../SELF_HOSTING.md).
5. Sign up with two *different* test accounts. Verify that each account sees only its own `pos_workspaces` row; an unauthenticated request must see neither.
6. In two tabs of the **same** account, edit concurrently and verify the later stale save shows a sync conflict instead of silently overwriting. Do not use a shared account for concurrent staff.
7. Test database backups and restoration in your own project. This template does not provide scheduled database backups.

## Authorization and limitations

RLS protects `owner_id` from cross-account access. Because the same account is allowed to modify its own JSON workspace, this schema does **not** provide immutable financial logs, cashier/manager/kitchen authorization, independently validated payments, or multi-user transaction safety. A user with database ownership can modify their own records. Real restaurant operations require a separately trusted API with normalized transactional data.

If the login screen reports missing relations, reload the Data API schema cache using your provider's guidance and verify the SQL ran successfully. Do not disable RLS to solve errors.

Supabase documentation: [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API](https://supabase.com/docs/guides/api/securing-your-api).
