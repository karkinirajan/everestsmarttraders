# Everest Smart Traders — Web Platform

Production-grade marketing site and CMS for Everest Smart Traders, Nepal's trusted supplier and installer of gate automation, smart door locks, hotel lock systems, rolling shutter motors, curtain motors, and video door phones.

---

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js 16.4 (App Router, Turbopack) |
| UI         | React 19.3, TypeScript 6.0 (strict)  |
| Styling    | Tailwind CSS v4, tw-animate-css      |
| Components | Base UI + shadcn-style primitives    |
| Icons      | Lucide React                         |
| Database   | Supabase (PostgreSQL)                |
| Auth       | Supabase Auth (email + password)     |
| Storage    | Supabase Storage                     |
| Validation | Zod v4                               |
| Images     | next/image + sharp                   |
| HTML       | sanitize-html (allow-list cleaner)   |
| Tests      | Vitest, PGlite (Postgres in WASM)    |

---

## Project Structure

```
everest-smart-traders/
├── app/
│   ├── (public)/          # Public-facing marketing site
│   ├── (admin)/admin/     # Admin CMS dashboard (auth required)
│   ├── (auth)/login/      # Admin login page
│   ├── api/               # Route handlers (inquiries, search)
│   ├── layout.tsx         # Root layout (metadata, fonts, structured data)
│   ├── robots.ts          # robots.txt generation
│   └── sitemap.ts         # Dynamic sitemap.xml
├── components/
│   ├── admin/             # Admin header & sidebar
│   ├── public/            # Public site components
│   └── ui/                # Reusable UI primitives
├── lib/
│   ├── actions/           # Server actions (form submission)
│   ├── supabase/          # Supabase clients + data queries
│   ├── validations/       # Zod schemas + sanitization
│   ├── auth.ts            # requireEditor / requireAdmin for server actions
│   ├── admin-rules.ts     # what the admin actions may write, and what errors may say
│   ├── media-rules.ts     # what may be uploaded (type from the bytes)
│   ├── rate-limit.ts      # Postgres-backed counters, in-memory fallback
│   ├── client-address.ts  # who is calling (forwarded headers trusted only where safe)
│   ├── sanitize.ts        # allow-list HTML cleaner for CMS content
│   └── json-ld.ts, search.ts, read-limited.ts
├── types/                 # TypeScript types (mirrors DB schema)
├── supabase/
│   ├── migrations/        # SQL schema migrations
│   └── seed.sql           # SQL seed data
├── scripts/
│   ├── apply-schema.mjs   # Apply every migration to the Supabase project, in order
│   ├── build-setup-sql.mjs# Generate supabase/setup.sql from the migrations
│   └── seed-db.mjs        # JavaScript seed script (preferred)
├── test/                  # Vitest: unit, action/route, database (real Postgres), mutation
├── docs/                  # Chapters: architecture, security, testing, operations
├── public/
│   ├── images/            # Static images (fallback gallery, brand assets)
│   └── site.webmanifest   # PWA manifest
├── proxy.ts               # Next.js 16 proxy middleware (session refresh + auth guard)
└── next.config.ts         # Security headers, image domains, bundle optimizations
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable                         | Required | Description                                                     |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes      | Your Supabase project URL                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes      | Supabase anon (public) key                                      |
| `SUPABASE_SERVICE_ROLE_KEY`      | Yes      | Supabase service role key (server-only, never expose to client) |
| `NEXT_PUBLIC_SITE_URL`           | Yes      | Full public URL (e.g., `https://everestsmarttraders.com`)       |
| `NEXT_PUBLIC_STORAGE_BUCKET`     | No       | Storage bucket name (default: `media`)                          |
| `NEXT_PUBLIC_ADMIN_LOGIN_DOMAIN` | No       | Optional email domain shorthand for admin logins                |
| `TRUST_PROXY_HEADERS`            | No       | `true` only behind a proxy you control that overwrites `X-Forwarded-For`. Leave unset on Vercel (detected). See [docs/02-security.md](docs/02-security.md) |

---

## Local Development

### 1. Install dependencies

Node 24 or newer (`.nvmrc` says 26, the current LTS):

```bash
nvm use
npm ci
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in your Supabase credentials
```

### 3. Apply database schema

```bash
node scripts/apply-schema.mjs
```

Runs every file in `supabase/migrations`, in order, against your Supabase project (the project is the one `NEXT_PUBLIC_SUPABASE_URL` names; it needs `SUPABASE_ACCESS_TOKEN` in `.env.local`). On a database that already ran the first three, apply only the newer ones: `node scripts/apply-schema.mjs --from 004`. **`004` closes a privilege-escalation hole; see [docs/02-security.md](docs/02-security.md).** Or paste `supabase/setup.sql` (generated from the migrations) into the SQL editor.

### 4. Seed the database

```bash
node scripts/seed-db.mjs
```

Populates all tables with clean, realistic data: products, categories, services, industries, projects, blog posts, FAQs, testimonials, homepage sections, site settings, SEO overrides, and sample inquiries. All operations are upserts — safe to re-run.

### 5. Fully reset and reseed application data (safe mode)

```bash
npm run db:reset-seed
```

This clears application content tables and repopulates deterministic seed data for QA and staging validation. It intentionally preserves auth users and profile identities, so existing admin logins are not removed.

### 6. Create an admin user

In your Supabase dashboard:
1. **Authentication → Users → Add User** — create a user with email and password
2. **SQL editor** — `update public.profiles set role = 'admin' where email = '<their email>';` (a signed-in user cannot change a role; the SQL editor and the service-role key can)

Also **turn off public sign-ups** in Supabase Authentication: the site has no sign-up page.

### 7. Start the dev server

```bash
npm run dev
```

- Public site: [http://localhost:3000](http://localhost:3000)
- Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin) (redirects to `/login`)

---

## Scripts

| Script          | Command                         | Description                                         |
| --------------- | ------------------------------- | --------------------------------------------------- |
| Dev             | `npm run dev`                   | Dev server with Turbopack                           |
| Build           | `npm run build`                 | Production build                                    |
| Start           | `npm run start`                 | Run production build                                |
| Lint            | `npm run lint`                  | ESLint (0 warnings allowed)                         |
| Type Check      | `npm run type-check`            | TypeScript strict check                             |
| Test            | `npm test`                      | Unit, action, route and database tests (Vitest)     |
| Coverage        | `npm run test:coverage`         | The same, with coverage                             |
| Check           | `npm run check`                 | Type-check, lint and tests                          |
| CI              | `npm run ci`                    | `check`, then a production build and `npm audit`    |
| Setup SQL       | `npm run db:build-setup`        | Regenerate `supabase/setup.sql` from the migrations |
| Apply Schema    | `node scripts/apply-schema.mjs` | Apply DB migrations                                 |
| Seed            | `node scripts/seed-db.mjs`      | Seed all tables with sample data                    |
| Reset + Seed    | `npm run db:reset-seed`         | Clear application data and reseed deterministically |
| Backfill Images | `npm run backfill:images`       | Backfill admin image references                     |

---

## Database

### Schema tables

| Table                | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `profiles`           | User accounts and roles (admin/editor/viewer)            |
| `site_settings`      | Key/value store for business info, contact, SEO defaults |
| `homepage_sections`  | CMS-managed content for each homepage section            |
| `product_categories` | Product groupings with slugs and SEO                     |
| `products`           | Full product catalog                                     |
| `product_images`     | Product image gallery                                    |
| `services`           | Service/installation offerings                           |
| `industries`         | Industry verticals with solutions                        |
| `projects`           | Case study installations                                 |
| `project_images`     | Project photo gallery                                    |
| `project_products`   | Many-to-many: projects ↔ products                        |
| `blog_categories`    | Blog categories                                          |
| `blog_posts`         | Blog articles with SEO and tags                          |
| `testimonials`       | Client testimonials with ratings                         |
| `faqs`               | Frequently asked questions                               |
| `inquiries`          | Contact and quote form submissions                       |
| `media_assets`       | Supabase Storage asset registry                          |
| `announcements`      | Optional site-wide banners                               |
| `seo_overrides`      | Per-route SEO customization                              |

### Row-Level Security

- Public reads only see published/active content
- Authenticated admins and editors have full CMS write access
- Nobody can write through the anon key: the forms insert with the service-role key (after validation and a rate limit)
- A signed-in user cannot change a role (migration `004`); only an admin, the SQL editor or the service-role key can
- The service role key bypasses RLS for secure server-side writes, so the code that holds it applies the rules (`lib/admin-rules.ts`, `lib/media-rules.ts`)

---

## Deployment

### Pre-deployment checklist

```bash
npm run lint
npm run type-check
npm run build
```

Recommended smoke checks after deployment:

```bash
curl -I https://your-domain.com/
curl -I https://your-domain.com/admin
curl https://your-domain.com/sitemap.xml
curl https://your-domain.com/robots.txt
```

Verify:
- [ ] All environment variables are set in the deployment platform
- [ ] `NEXT_PUBLIC_SITE_URL` is set to your production domain
- [ ] At least one admin user exists in Supabase Auth
- [ ] Database schema has been applied, **including `004` and `005`** (`apply-schema.mjs`)
- [ ] Public sign-ups are off in Supabase Authentication
- [ ] `robots.txt` and `sitemap.xml` resolve at the production domain

### Vercel

This project is optimized for Vercel:

```bash
vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deployments from `main`.

---

## Architecture Notes

### Proxy middleware (Next.js 16)

`proxy.ts` is the Next.js 16 convention for middleware (equivalent to `middleware.ts` in earlier versions). It runs on every non-static request and:

1. Refreshes Supabase session cookies (required by `@supabase/ssr`)
2. Redirects unauthenticated users from `/admin/*` to `/login`
3. Redirects authenticated users away from `/login` to `/admin`

The admin layout independently re-validates auth as defence-in-depth.

### Server/client boundary

- Public pages fetch data using the anon key with RLS (safe for client-facing use)
- Admin pages use session-based `createServerClient` from `@supabase/ssr`
- Server actions use `createAdminClient` (service role key) to bypass RLS
- The service role key is **never** imported in client components

### Image strategy

- Fallback images use a deterministic hash of the entity slug against a 100-image pool in `/public/images/home-automation/`
- Real images are stored in Supabase Storage and served via the Supabase CDN
- All `<Image>` components use `fill` with explicit `sizes` props for optimal loading

### Security

- Content Security Policy, X-Frame-Options, HSTS, and other headers set in `next.config.ts`
- Form inputs sanitized on submission (HTML tags and control characters stripped)
- Honeypot fields on all public forms to reduce bot submissions
- Rate limiting: forms 5 per hour per caller and 200 an hour overall, inquiry API 12/min per caller (all counted in Postgres), search API 90/min per caller (in memory)
- All form inputs validated with Zod schemas before database insertion
- CMS HTML cleaned with an allow-list parser before it is rendered; JSON-LD escaped
- Admin server actions check the session and role themselves, allow-list tables, validate ids and payloads, and never show database errors to the browser
- Uploads: type read from the file's bytes, 10 MB cap, known folders only

Details, what was fixed and what is left: [docs/02-security.md](docs/02-security.md).

### Caching

- Most public pages are statically generated at build time
- Dynamic routes use `generateStaticParams` for SSG
- Admin pages use `await connection()` to force dynamic rendering and prevent stale data
- To update static content after publishing, trigger a redeploy or implement on-demand ISR

---

## Maintenance

- **Adding admin users:** Supabase Auth dashboard → create user → set `role = admin` in `profiles`
- **Content updates:** Admin dashboard at `/admin`
- **Schema changes:** Add a new file in `supabase/migrations/`, run `apply-schema.mjs --from <number>`, then `npm run db:build-setup`
- **Image uploads:** Media section in the admin dashboard
- **Reseeding:** `node scripts/seed-db.mjs` is safe to re-run (all upserts)

---

## Documentation

| Chapter | Covers |
| ------- | ------ |
| [01 Architecture](docs/01-architecture.md) | Request flow, trust levels, where each rule lives, migrations |
| [02 Security](docs/02-security.md) | What was fixed, how to configure it, what is left |
| [03 Testing](docs/03-testing.md) | The suite, the real-Postgres tests, mutation checks |
| [04 Operations](docs/04-operations.md) | Migrations to apply, first admin, secrets, logs, CI |
| [VERSIONS.md](VERSIONS.md) | What it runs on and why |
| [work-done.md](work-done.md) | What was there and what changed, file by file |

`INSTRUCTIONS.md` is the original build's working document and was left as it was.
