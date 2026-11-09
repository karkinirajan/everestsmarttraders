# 04. Operations

## Deploying

Vercel (`next.config.ts` sets the security headers; the rate limits recognise the platform's forwarded address). Set the variables
from the [README](../README.md#environment-variables). Run `npm run ci` before a release.

## Before deploying this version: apply the migrations

1. **Apply `supabase/migrations/004_lock_profile_roles_and_inquiries.sql` and `005_rate_limits.sql`** (SQL editor, or
   `node scripts/apply-schema.mjs --from 004`). Both are safe to apply twice. **004 is the important one**: until it is applied,
   anyone who can sign up can become an admin ([02 Security](02-security.md)).
2. **Disable public sign-ups** in Supabase Authentication.
3. **Check `TRUST_PROXY_HEADERS`**: leave it unset on Vercel; set `true` only behind a proxy of your own.
4. **Look at who is an admin** now, since the hole existed until 004:

   ```sql
   select p.id, p.email, p.role, p.created_at from public.profiles p where p.role in ('admin', 'editor') order by p.created_at;
   ```

   Anyone you do not recognise should be demoted (`update public.profiles set role = 'viewer' where id = ...`) and their auth user
   deleted. Check **Authentication → Users** for accounts you did not create.
5. The migrations were run against Postgres (PGlite) in the tests, **not against your Supabase project**. Try them on a branch first.

## First admin

Create the user in **Authentication → Users**, then in the SQL editor (this has no signed-in user, so the role trigger allows it):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

`scripts/create-admin-users.mjs` does the same from the command line with the service-role key (`ADMIN_INITIAL_PASSWORD` in the
environment, never in the script).

## The database SQL

`supabase/setup.sql` is generated from the migrations: `npm run db:build-setup` after adding a migration. A test fails if it is stale.

## Secrets

Rotate a secret when it may have been seen. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS: if it leaks, rotate it in the Supabase
dashboard and redeploy. The repository was scanned for credentials (working tree and history; a pattern scan, `.env*` files were not
read): none found.

## Things to watch in the logs

| Line | Meaning |
|---|---|
| `[admin] <action> failed: <code> <message>` | A dashboard write failed. The editor saw a short sentence; the detail is here. |
| `[rate limits] rate_limit_hit is not available ...` | Migration 005 is missing or the database could not be reached; form limits are per instance. |
| `Inquiry insert error:` / `Quote insert error:` | A form submission could not be stored. |

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`, on Node 24 and 26: install, type-check, lint (zero
warnings), tests with coverage (including the database tests), build (with placeholder environment values), `npm audit`.

## Keeping the free-tier database awake

Supabase pauses free projects after about 7 days without database activity. A real write happens at least once a day:

| Trigger | Schedule | Notes |
| --- | --- | --- |
| Vercel Cron (`vercel.json`) | daily 03:00 UTC to `/api/keepalive` | Set `CRON_SECRET` in Vercel; Vercel sends it as a Bearer token. |
| GitHub Actions (`.github/workflows/keepalive.yml`) | daily 04:17 UTC + manual | Needs repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; optional `SITE_URL`, `CRON_SECRET`. |
| `/api/health`, admin dashboard | on visit | Self-healing: writes once per UTC day per instance. |

Apply `supabase/migrations/006_keepalive_heartbeat.sql` (or re-run `supabase/setup.sql`). It adds `system_heartbeats` and
`record_heartbeat()`, which upserts today's row and prunes rows older than 30 days. Without it the code falls back to
`rate_limit_hit`, then to a `site_settings` upsert. Manual run: `npm run db:keepalive`.
