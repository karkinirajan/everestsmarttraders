# Versions

What this project runs on, and why, as of 2026-11-09. Everything below was read from the lockfile, `node_modules` or the npm
registry on that day; nothing is quoted from memory.

## Runtime

| | Version | Notes |
|---|---|---|
| Node.js | **26** (`.nvmrc`); `engines.node >=24` | 26 is the current LTS, 24 the oldest supported. CI runs both. |
| npm | 12.x | |
| Database | Supabase (Postgres) | The SQL in `supabase/migrations` is tested against a real Postgres (PGlite). Supabase's own Postgres version is whatever the project runs. |

## Application

| Package | Installed | Was | Range now |
|---|---|---|---|
| next | 16.4.5 | ^16.2.3 | `^16.4.5` |
| react / react-dom | 19.3.1 | 19.2.4 (exact) | `^19.3.1` |
| @supabase/supabase-js | 2.119.0 | ^2.103.0 | `^2.119.0` |
| @supabase/ssr | 0.12.7 | ^0.6.1 | `^0.12.7` (needs supabase-js >= 2.114) |
| tailwindcss, @tailwindcss/postcss | 4.3.5 | ^4.2.2 | `^4.3.5` |
| tailwind-merge | 3.7.0 | ^3.5.0 | `^3.7.0` |
| zod | 4.6.7 | ^4.3.6 | `^4.6.7` (4.3.6 had an advisory: memory use on oversized collections) |
| @base-ui/react | 1.9.0 | ^1.3.0 | `^1.9.0` |
| lucide-react | 1.70.0 | ^1.8.0 | `^1.70.0` |
| sharp | 0.35.5 | ^0.33.5 | `^0.35.5` |
| **sanitize-html** | 2.18.1 | (new) | `^2.18.1`: the HTML cleaner, see [docs/02-security.md](docs/02-security.md) |

## Tooling

| Package | Installed | Was | Why |
|---|---|---|---|
| typescript | **6.0.3** | ^5.9.3 | `~6.0.3`. 7.0.2 exists, but `typescript-eslint` (inside `eslint-config-next`) supports `<6.1`. |
| eslint | **10.14.0** | ^9.39.4 | Latest. `eslint-config-next` 16.4.5 allows `>=9`. |
| eslint-config-next | 16.4.5 | ^16.2.3 | Matches Next. |
| @types/node | 24.x | ^22.19.17 | The oldest supported Node (24), so the types do not offer APIs that Node 24 lacks. |
| **vitest**, **@vitest/coverage-v8** | 5.1.0 | (new) | Tests. The two must match each other. |
| **@electric-sql/pglite** | 0.5.15 | (new) | Postgres compiled to WASM: runs the migrations for real in the tests, with no service to start. |

## Changes made in this pass

- Every package above moved to its latest release, and `npm audit` went from **21 vulnerabilities (1 critical, 9 high)** to **0**.
  The `overrides` entry `minimatch ^11.0.5` is what clears the last ten: `minimatch` 7 to 11.0.0 carries an advisory (a
  denial of service in glob patterns) and ESLint and typescript-eslint pull it in.
- `engines.node >=24` and `.nvmrc` (`26`) added; scripts `test`, `test:watch`, `test:coverage`, `check`, `ci` and `db:build-setup` added.
- `react` and `react-dom` were pinned to exact versions; they are now caret ranges like everything else (the lockfile pins what is installed).

## Left alone

Nothing the registry offered was held back, except TypeScript 7 (see above).

Re-check with `npm outdated` when touching dependencies.
