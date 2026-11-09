# 01. Architecture

A Next.js 16 (App Router) marketing site and CMS, on Supabase (Postgres, Auth, Storage).

## Request flow

```text
visitor  ──► public page (static, rebuilt when an admin saves) ──► lib/supabase/queries.ts (anon key, RLS) ──► Supabase
visitor  ──► contact / quote form ──► server action (lib/actions/inquiry.ts) ──► rate limit ──► validate ──► service role ──► inquiries
visitor  ──► /api/search, /api/inquiries ──► rate limit ──► validate ──► service role
admin    ──► proxy.ts (session + role) ──► admin layout (session + role again) ──► page ──► server action ──► service role
```

Three trust levels, and where each is enforced:

| Caller | Key it holds | What stops it |
|---|---|---|
| Anyone | the **anon key** (it is in every page's JavaScript) | Row Level Security: it may read published content and nothing else. It cannot write anywhere ([migration 004](../supabase/migrations/004_lock_profile_roles_and_inquiries.sql) removed the last public write). |
| A signed-in editor or admin | a session cookie | `proxy.ts` and `app/(admin)/admin/layout.tsx` guard the pages; **every server action checks the session and the role itself** (`lib/auth.ts`), because a server action is a public POST endpoint. |
| The server | the **service-role key** | It bypasses RLS entirely, so the code that holds it applies the rules: `lib/admin-rules.ts` (which tables, which ids, what a payload may contain), `lib/media-rules.ts` (what may be uploaded). |

## Where each rule lives

| Question | Module |
|---|---|
| Is this caller an admin or editor | `lib/auth.ts` (`requireEditor`, `requireAdmin`) |
| May this table, id, conflict column, payload be written | `lib/admin-rules.ts`, applied by `lib/actions/admin-mutate.ts` |
| May this file be stored, under what name and type | `lib/media-rules.ts`, applied by `lib/actions/media.ts` |
| Is this caller flooding | `lib/rate-limit.ts` (Postgres counters, in-memory fallback) |
| Which address is the caller | `lib/client-address.ts` (the forwarded header is believed only on Vercel or with `TRUST_PROXY_HEADERS=true`) |
| Is this form input acceptable | `lib/validations/inquiry.ts` (Zod) |
| What may the browser be told when a write fails | `lib/admin-rules.ts` `publicMessage` (a sentence by Postgres error code, never the database's text) |
| Is this HTML safe to render | `lib/sanitize.ts` (an allow-list parser) |
| Is this JSON safe inside a `<script>` | `lib/json-ld.ts` |
| How big may a request body be | `lib/read-limited.ts` (counted as the bytes arrive) |
| How is the search text put into a PostgREST filter | `lib/search.ts` (quoted) |

## Database

`supabase/migrations/` is the source of truth, applied in order (`node scripts/apply-schema.mjs`, or the SQL editor):

| File | Does |
|---|---|
| `001_initial_schema.sql` | Tables, the profile-on-signup trigger |
| `002_rls_policies.sql` | Row Level Security |
| `003_add_video_url.sql` | `blog_posts.video_url` |
| `004_lock_profile_roles_and_inquiries.sql` | **Security:** a signed-in user could make themselves an admin; anyone could insert inquiries directly |
| `005_rate_limits.sql` | The counters behind the form limits, callable only with the service-role key |

`supabase/setup.sql` is generated from the files above (`npm run db:build-setup`); a test fails if it is out of date.

## Caching

Public pages are built statically. Every admin write calls `revalidatePath("/", "layout")`, so a saved change shows on the site
without a deploy. The admin pages themselves are dynamic (`await connection()`).
