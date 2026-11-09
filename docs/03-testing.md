# 03. Testing

```bash
npm test                 # everything, once
npm run test:coverage    # with coverage
```

361 tests in 16 files (Vitest). They need no network, no Supabase project and no credentials; the whole run takes about 20 seconds.

## Layout

```text
test/
  db/         the SQL, run for real: the migrations in Postgres (PGlite) with Supabase's roles and auth.uid()
  lib/        one module at a time: sanitizer, JSON-LD, address, limiter, admin rules, media rules, search, body reader
  actions/    the server actions (admin writes, media, passwords, the two forms) against a recording fake Supabase
  api/        the two route handlers (inquiries, search), called as Next would call them
  helpers/    supabase-sql.ts (the PGlite harness), fake-supabase.ts (the recording stand-in), mocks.ts
  mutation/   the mutation driver and its list
```

### Real Postgres for the SQL

`test/helpers/supabase-sql.ts` sets up a PGlite database the way Supabase does (the `anon`, `authenticated` and `service_role`
roles, an `auth.users` table, `auth.uid()` reading the request's JWT claims) and applies every file in `supabase/migrations`. The
tests then act as each kind of caller (`as(db, { role: "authenticated", userId }, ...)`), so they check what RLS and the triggers
really do, not what the policy text looks like. They include the **defect as it shipped**: with migrations 001 to 003 only, a
freshly signed-up viewer can make themselves an admin, and anyone can insert an inquiry with a status of their choosing; with 004
neither is possible. A test also fails if `supabase/setup.sql` is not exactly the migrations.

Differences from Supabase: PGlite has no `uuid-ossp` (the one function used is stubbed), and the roles are stand-ins; Supabase's own
Auth tables and Storage are not present.

### The fake Supabase

The action and route tests use `test/helpers/fake-supabase.ts`, which records every `from().insert/update/upsert/delete/select`
with its filters, every `rpc()`, every storage call, and answers from a queue. It is not Postgres: it checks what the code asks for
(which table, which filters, which payload, in which order), and the SQL tests above check what the database then does.

## Coverage

Over `lib/**` (the code that holds the rules):

| | |
|---|---|
| Statements | 71.92% (374 of 520) |
| Branches | 74.46% (277 of 372) |
| Functions | 51.42% (54 of 105) |
| Lines | 69.35% (310 of 447) |

The number is held down by files this pass did not touch and that have no tests: `lib/supabase/queries.ts` (the public data
queries, 387 lines), `lib/utils.ts`, `lib/image-fallbacks.ts` and the Supabase client factories. The modules this pass added or
rewrote are at 100% of statements (`media-rules`, `rate-limit`, `sanitize`, `json-ld`, `client-address`, `admin-rules`, `search`,
`read-limited`, `auth`) except the actions, which are at 96 to 100%. The interface (`app/`, `components/`) has no tests, and no
browser test exists in this repository.

## Mutation checks

`test/mutation/mutants.py` holds 136 deliberate bugs, each `(name, file, old text, new text)`: a limit off by one, a check removed,
a script scheme allowed, a trigger not attached, a policy kept, an upload type loosened, a rate limit ignored. The driver applies
one at a time and counts it **killed** if the tests then fail. All 136 are killed. (The first run found seven survivors: five
missing assertions and one redundant guard, which was removed.)

```bash
python3 test/mutation/mutate.py test/mutation/mutants.py -- npx vitest run --bail 1
python3 test/mutation/groups.py        # the same, in parallel copies of the repo, each against only the tests that exercise it
```

Rules: the suite must be green first (the driver checks); do not edit the tree while it runs; each pattern must occur exactly once. A
survivor is either a missing test or redundant code; the equivalents that were left out are listed at the top of the file.

## Adding a test

Put it beside the nearest existing one and prove it can fail: change the code it protects, watch it go red, change it back. If it
guards a security rule, add the mutant to the list.
