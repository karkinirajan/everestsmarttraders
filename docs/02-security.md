# 02. Security

What an audit of the existing code found and fixed, how to configure what needs configuring, and what was left on purpose. Each
fix has tests, and the security-relevant code was mutation-checked ([03 Testing](03-testing.md)).

## What was fixed

### Anyone could become an admin (migration 004)

`002_rls_policies.sql` had a policy, "Profiles: own profile writable", that let any signed-in user UPDATE their own profile row with
no limit on which columns. The anon key is public, and Supabase Auth lets people sign up unless sign-ups are switched off, so:

1. sign up (one request to the Auth API, no UI needed);
2. `update profiles set role = 'admin' where id = <your id>` with the anon key and your own token;
3. the proxy and the admin layout both trust `profiles.role`: you are in the admin area, and can edit all content, read every
   inquiry, and change any user's password.

This was reproduced against the shipped migrations in a real Postgres before it was fixed (`test/db/rls.test.ts`, "before migration
004"). Migration 004 adds a trigger that refuses a role change by a signed-in user who is not an admin, makes the update policy
check the new row as well as the old one, and refuses a change of profile id. Direct database access (the SQL editor) and the
service-role key carry no user, so making the first admin, and `scripts/create-admin-users.mjs`, still work.

### Unchecked public writes to `inquiries` (migration 004)

The policy "Inquiries: public insert" (`with check (true)`) let anyone with the anon key insert rows straight into the table: no
validation, no honeypot, no rate limit, and their own `status` and `notes`. The site only inserts through the service-role client,
which bypasses RLS, so the policy was not needed and is dropped.

### The form actions and the inquiry API

| Was | Now |
|---|---|
| The contact and quote forms (server actions) had **no rate limit**: only a honeypot. Anyone could insert unlimited rows. | 5 messages an hour per caller and 200 an hour for the whole site, counted in Postgres (`005_rate_limits.sql`). The site ceiling only counts callers within their own limit, so one flooder cannot use it up and lock real customers out. **The inquiry API uses the same limits through the same helper (`lib/inquiry-limits.ts`)**: it used to allow 12 a minute, which is 720 an hour per address, so it was a faster door to the same table. An integration that needs more should get its own authenticated route. |
| `getClientIp` believed `cf-connecting-ip`, `x-forwarded-for` and `x-real-ip` from any request, so a caller picked their own rate-limit key, and a different one on every request. | `lib/client-address.ts`: believed only on Vercel or with `TRUST_PROXY_HEADERS=true`; otherwise every caller shares one key. `CF-Connecting-IP` is a Cloudflare header that Vercel passes through untouched, so it is read only with the further opt-in `TRUST_CLOUDFLARE_HEADERS=true`. IPv6 callers are keyed on their /64 and IPv4-mapped addresses are treated as the IPv4 address. |
| The inquiry API's 50 KB limit read the `Content-Length` header, which a chunked request does not have. | The size is counted as the bytes arrive (`lib/read-limited.ts`). |
| The rate-limit maps were cleared of expired entries only, so a flood of keys could grow them without bound. | The in-memory limiter is bounded and, when full, drops the least-used callers first, never the ones who are being refused. |
| `location` in the inquiry API was stored at any length. | At most 120 characters. |
| The search box put the query into a PostgREST `or=` filter string unquoted, so `,` and `()` (which the input check allowed) added conditions of the caller's own. | The pattern is quoted and escaped (`lib/search.ts`). |

### Rich text and JSON-LD

CMS HTML (blog posts, tutorials, product descriptions) is rendered with `dangerouslySetInnerHTML`, so whatever an admin or editor
saves runs in every visitor's browser (and the CSP allows inline scripts). It was cleaned with a chain of regular expressions, which
cannot parse HTML: `<a href=javascript:alert(1)>` (no quotes), `<img/src=x/onerror=alert(1)>` (slashes for spaces), entity-encoded
schemes and `<svg onload>` all got through. It is now cleaned by `sanitize-html` with an allow-list of tags, attributes and URL
schemes (`lib/sanitize.ts`), tested against 36 known payloads.

The FAQ page and the root layout put JSON into `<script type="application/ld+json">`. `JSON.stringify` leaves `<` as it is, so an FAQ
answer containing `</script><script>...` ended the block. `lib/json-ld.ts` escapes `<` and the two line separators.

### The admin server actions

| Was | Now |
|---|---|
| `adminInsert/Update/Upsert` took any payload: `id`, `created_at` and any other column could be set from the browser; the upsert key column was whatever the caller named. | The columns the database owns are dropped; the payload must be a plain object under 200 KB; the upsert key must be one the table uses (`lib/admin-rules.ts`). |
| Update and delete took any string as an id. | UUIDs only. |
| A failed write returned Postgres's own message (table names, constraint names) to the browser. | A short sentence chosen by error code; the full error goes to the server log. |
| Media upload trusted the type the browser declared and used the folder and file name it sent; any file type up to the framework's limit was stored in a **public** bucket (an uploaded `.html` or `.svg` is then served from the project's storage domain). | The type is read from the file's bytes (JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, PDF; never SVG or HTML), the size is capped at 10 MB, the folder must be a known one, the stored name and content type come from the detected type. |
| `adminDeleteMedia(id, storagePath)` deleted whatever path the browser sent, independent of the record. | `adminDeleteMedia(id)`: the file removed is the one the record names. The record's own `storage_path`, `url`, `mime_type`, `size` and `folder` cannot be written through the generic update/insert actions (`PROTECTED_COLUMNS`; they are set by the upload from the file's bytes), so an editor cannot re-point a record at another object and then delete it; and the path must be a known folder plus a plain file name (no `..`, no empty segment) before anything is removed. |
| The same session-and-role check was written out twice, and a second, cookie-bound copy of the service-role client sat unused in `lib/supabase/server.ts` (it would have carried the user's token instead of bypassing RLS). | One `requireEditor`/`requireAdmin` in `lib/auth.ts`; the unused client is gone. |
| The media library could not upload a file over 1 MB (Next's server-action body limit) although it advertised more. | `serverActions.bodySizeLimit` is 11 MB, matching the 10 MB file cap. |

## Configuration

### Turn off public sign-ups

The site has a login page and no sign-up page, so **disable "Allow new users to sign up"** in Supabase (Authentication → Sign In /
Providers). Migration 004 closes the escalation either way; with sign-ups off, strangers cannot have an account at all.

### `TRUST_PROXY_HEADERS`

Leave it unset on Vercel (the platform is detected). Anywhere else, set it to `true` **only** if a proxy you control overwrites
`X-Forwarded-For`. Otherwise every caller counts as one address and a warning is logged.

### Migrations

Apply `004` and `005` (see [04 Operations](04-operations.md)). Until `005` is applied the form limits count in memory per instance
and the log says so.

### Storage

Storage bucket policies are not in the repository (they are set in the Supabase dashboard). The code assumes the bucket is
publicly readable and written only with the service-role key; check that no policy lets `anon` or `authenticated` upload.

## Known and left alone

- **`site_settings` is readable by anyone** (the public pages need it). Keep nothing secret in it.
- **The admin pages read with the service-role key** after the proxy and the layout have checked the session. A new admin page that
  forgot the layout would have no check of its own; every action does check.
- **The CSP allows `'unsafe-inline'` scripts** (`next.config.ts`), which weakens it against cross-site scripting. A nonce-based
  policy needs dynamic rendering for pages that are otherwise static. The HTML cleaner above is what stands between stored content
  and a visitor's browser.
- **Sign-in goes straight from the browser to Supabase Auth**, so brute-force limits are Supabase's own settings, not this code's.
  The login form ignores the `redirectTo` that the proxy sets (it always goes to `/admin`).
- **`/api/search` is limited in memory per instance**, not in Postgres (a limit that is visibly there is enough for a search box).
- **No end-to-end test against a real Supabase project.** The SQL is tested in Postgres (PGlite) with Supabase's roles and
  `auth.uid()` stubbed; the code is tested against a recording stand-in for `supabase-js`.
- `INSTRUCTIONS.md` is an AI working document from the original build and was left alone.
