# Work done

What this repository was, what was changed, and what still needs a person. Branch: `chore/modernize` (local, nothing pushed).
Start point: `c21cf93`.

## At a glance

- **Was:** a Next.js 16 marketing site and CMS on Supabase (Postgres, Auth, Storage). No tests, no CI, no version pins, 21 known
  vulnerabilities in the lockfile (1 critical, 9 high), and a database policy that let **anyone who could sign up make themselves an
  admin**. Reading the code with an attacker's eye found more: forms with no rate limit, a regex-based HTML cleaner, caller addresses
  taken from spoofable headers, admin actions that took any payload and showed database errors.
- **Now:** all of that fixed, each fix with tests. 395 tests in 16 files, 144 deliberate bugs that the suite fails for, the SQL
  migrations run for real in Postgres (PGlite), dependencies on current releases with `npm audit` at 0, CI on Node 24 and 26,
  README extended, `VERSIONS.md` and four docs chapters added.
- **Needs a person:** **apply migration `004` to the Supabase project, and check who the admins are** (the hole existed until it is
  applied); apply `005`; turn off public sign-ups; push. See [What a person might want to do](#what-a-person-might-want-to-do).

## Verified

Run on the final tree, 2026-11-09:

| Gate | Command | Result |
|---|---|---|
| Types | `npm run type-check` | pass |
| Lint | `npm run lint` | pass, 0 errors and 0 warnings (`--max-warnings=0`) |
| Tests | `npm test` | 395 passed, 16 files |
| Coverage | `npm run test:coverage` | over `lib/**`: statements 72.81%, branches 76.07%, functions 52.33%, lines 70.15%; the files this pass added or rewrote are at or near 100%, the low figure is untouched, untested files (`queries.ts` and others), see [docs/03-testing.md](docs/03-testing.md) |
| Mutation | `test/mutation/groups.py` | 144 of 144 killed, each group on a green baseline, in separate copies of the repo (a first run left 7 survivors: 5 missing assertions fixed, 1 redundant guard removed; after the review follow-up, one more redundant check removed and one defensive no-op listed as equivalent) |
| Build | `npm run build` | pass (with placeholder Supabase values: no real project was contacted) |
| Audit | `npm audit` | 0 vulnerabilities (was 21) |
| Secrets | pattern scan of the tree and all 8 commits | none found (a pattern scan, counts only; `.env*` files were not read; not a guarantee) |
| Formatting | | not checked: the project has no formatter configured |

**Not verified:** the migrations against a real Supabase project (they ran in PGlite with Supabase's roles and `auth.uid()` stubbed);
the site rendering in a browser (there is no browser test in the repository and none was run); a login, a form submission or an upload
against real Supabase and its storage; Supabase's own Auth sign-up setting.

## Findings and fixes

| Finding | Fix |
|---|---|
| **Policy "Profiles: own profile writable" let any signed-in user set their own `role` to `admin`** (reproduced against the shipped migrations in Postgres) | Migration 004: a trigger refuses a role change by a signed-in non-admin; the update policy now checks the new row; a profile id cannot change |
| **"Inquiries: public insert" let anyone with the anon key insert rows directly**, choosing their own status and notes | Policy dropped (the site inserts with the service-role key) |
| Contact and quote server actions had no rate limit; the inquiry API allowed 12 a minute per caller | 5 an hour per caller, 200 an hour for the site, counted in Postgres (migration 005, callable only with the service-role key), through one helper shared by the forms and the API |
| Caller address taken from `cf-connecting-ip` / `x-forwarded-for` / `x-real-ip` on any request, so a caller chose their rate-limit key | Believed only on Vercel or with `TRUST_PROXY_HEADERS=true`; `CF-Connecting-IP` only with the further opt-in `TRUST_CLOUDFLARE_HEADERS=true` (Vercel passes it through untouched); IPv6 keyed on the /64 |
| Inquiry API's size limit trusted `Content-Length` (absent on a chunked request); `location` unbounded | Bytes counted as they arrive; location capped at 120 |
| Search text put unquoted into a PostgREST filter string (`,` and `()` added conditions) | Quoted and escaped |
| CMS HTML cleaned with regexes (`<a href=javascript:...>` with no quotes, `<img/src=x/onerror=...>` and others got through) | `sanitize-html` with an allow-list; 36 known payloads in the tests |
| FAQ JSON-LD could be closed with `</script>` by an editor | `jsonLd()` escapes `<` and the line separators |
| Admin actions: any payload (ids, timestamps), any upsert key, any id text, database errors shown to the browser | Server-owned columns dropped, upsert keys allow-listed per table, UUID ids, a sentence by error code (the detail is logged) |
| Media upload trusted the declared type, folder and file name; any type was stored in a public bucket; delete removed whatever path the browser sent | Type from the bytes (never SVG/HTML), 10 MB cap, known folders, generated names, delete uses the record's path; the record's path/url/type/size/folder cannot be rewritten through the generic actions, and the path is checked before anything is removed |
| Media library could not upload a file over 1 MB (framework default) | `serverActions.bodySizeLimit` 11 MB |
| Session-and-role check copied twice; an unused cookie-bound service-role client in `server.ts` | One `lib/auth.ts`; the unused client removed |
| `scripts/apply-schema.mjs` ran only migrations 001 and 002 and hard-coded one project's id | Runs every migration in order (`--from 004`); the project comes from `NEXT_PUBLIC_SUPABASE_URL` |
| `supabase/setup.sql` was a hand-kept copy that had drifted from the migrations | Generated by `scripts/build-setup-sql.mjs`; a test fails if it is stale |
| 21 vulnerabilities in dependencies | Upgraded; `minimatch` override; 0 |

Details and the things left alone: [docs/02-security.md](docs/02-security.md).

## Changes, file by file

### Source

| File | Was | Now |
|---|---|---|
| `lib/auth.ts` (new) | session check written twice, in two actions | `requireEditor`, `requireAdmin` |
| `lib/admin-rules.ts` (new) | table list and no other rules inside the action | Table and conflict-column allow-lists, UUID check, payload cleaning, `publicMessage` |
| `lib/actions/admin-mutate.ts` | Any payload, any id, database errors returned | Uses the rules above; logs the detail |
| `lib/media-rules.ts` (new) | none | Type from the bytes, caps, folders, names |
| `lib/actions/media.ts` | Declared type and folder trusted; delete by client path | Validated upload; delete by record; `adminDeleteMedia(id)` |
| `lib/actions/users.ts` | Own role check | `requireAdmin` |
| `lib/actions/inquiry.ts` | Honeypot only | Honeypot, then the rate limits |
| `lib/client-address.ts` (new), `lib/validations/inquiry.ts` | `getClientIp` believed any header | `clientAddress` |
| `lib/inquiry-limits.ts` (new) | per-route limits | One limiter for the forms and the inquiry API |
| `lib/rate-limit.ts` (new) | per-route in-memory maps | Postgres counters with a bounded in-memory fallback |
| `lib/sanitize.ts` (new), `lib/utils.ts` | Regex cleaner in `utils.ts` (client-imported) | Parser-based allow-list, server only; `utils.ts` keeps the helpers |
| `lib/json-ld.ts` (new), `app/layout.tsx`, `app/(public)/faq/page.tsx` | `JSON.stringify` into a script tag | `jsonLd()` |
| `lib/search.ts`, `lib/read-limited.ts` (new) | inline | Quoted filters; a bounded body reader |
| `app/api/inquiries/route.ts`, `app/api/search/route.ts` | In-memory maps, header-trusting address, `Content-Length` check | Shared limiter, trusted address, counted body |
| `app/(public)/{blog,tutorials,products}/...` | imported the cleaner from `utils` | from `lib/sanitize` |
| `app/(admin)/admin/media/media-manager.tsx` | `adminDeleteMedia(id, path)` | `adminDeleteMedia(id)` |
| `lib/supabase/server.ts` | also exported an unused service-role client | session client only |
| `supabase/migrations/004_…`, `005_…` (new) | | See above |
| `supabase/setup.sql` | Hand-kept, drifted | Generated |
| `scripts/apply-schema.mjs` | 001 and 002 only, one project id | All migrations, `--from`, project from the URL |
| `scripts/build-setup-sql.mjs` (new) | | Generator and `--check` |
| `next.config.ts` | | `serverActions.bodySizeLimit: "11mb"` |

### Configuration and tooling

| File | Was | Now |
|---|---|---|
| `package.json` | Older ranges, exact React pin, no tests, no `engines` | See [VERSIONS.md](VERSIONS.md); `engines.node >=24`; scripts `test`, `test:watch`, `test:coverage`, `check`, `ci`, `db:build-setup`; `minimatch` override |
| `package-lock.json` | | Regenerated |
| `.nvmrc` (new) | | `26` |
| `eslint.config.mjs` | | Also ignores the generated `coverage/` |
| `vitest.config.ts` (new) | | Node environment, `@` alias, coverage over `lib/**` |
| `.github/workflows/ci.yml` (new) | none | Node 24 and 26: type-check, lint, tests with coverage, build, `npm audit` |
| `test/` (new) | none | 16 test files, helpers, `test/mutation/` (driver, 144 mutants, grouped runner) |

### Docs

`README.md` extended (Node version, scripts, the two security migrations, sign-ups, `TRUST_PROXY_HEADERS`, a corrected RLS and
security section, a docs table; the rest of the owner's text is unchanged). `VERSIONS.md`, `docs/01` to `04` and this file are new.
`INSTRUCTIONS.md` is the original build's AI working document and was left alone. `.env.example` was not read or changed (by rule);
`TRUST_PROXY_HEADERS` is documented in the README.

## What a person might want to do

1. **Apply `supabase/migrations/004_lock_profile_roles_and_inquiries.sql` and `005_rate_limits.sql`** (SQL editor, or
   `node scripts/apply-schema.mjs --from 004`). Both are safe to apply twice. Try them on a branch first: they were run only in PGlite.
2. **Check who the admins are** (query in [docs/04-operations.md](docs/04-operations.md)) and look at **Authentication → Users** for
   accounts you did not create: until 004 is applied, anyone able to sign up could have promoted themselves.
3. **Turn off public sign-ups** in Supabase Authentication; the site has no sign-up page.
4. **Check the storage bucket's policies** in the dashboard (they are not in the repository): `anon` and `authenticated` should not be
   able to upload.
5. **Decide `TRUST_PROXY_HEADERS`** if the site is not on Vercel. **Note a behaviour change:** the inquiry API now allows 5 an hour per caller (it allowed 12 a minute); an integration that needs more should get its own authenticated route.
6. **Push** when satisfied: `git push -u origin chore/modernize` (not done here).
7. The old project id that `scripts/apply-schema.mjs` hard-coded is still in the repository's history; it is an identifier, not a
   secret. No credential was found in the tree or the history, so no secret needs rotating on account of this pass.

## Known and left alone

- `site_settings` is readable by anyone (the public pages need it): keep nothing secret in it.
- The admin pages read with the service-role key after the proxy and layout check the session; a new page that bypassed the layout
  would have no check of its own.
- The CSP allows `'unsafe-inline'` scripts; the HTML cleaner is the defence for stored content.
- Sign-in goes from the browser straight to Supabase Auth (its own brute-force limits apply); the login form ignores `redirectTo`.
- `/api/search` is limited in memory per instance, not in Postgres.
- `lib/supabase/queries.ts` (the public data queries), `lib/utils.ts` and the interface have no unit tests; there is no browser test.
- Nothing was run against a live Supabase project.
