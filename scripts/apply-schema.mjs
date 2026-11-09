/**
 * Everest Smart Traders — Schema + Migration runner
 *
 * Uses the Supabase Management API to apply the files in supabase/migrations, in order, each as its own query, stopping at the
 * first one that fails.
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env.local (get it from https://supabase.com/dashboard/account/tokens). The project is the one
 * NEXT_PUBLIC_SUPABASE_URL points at (or SUPABASE_PROJECT_REF, if set).
 *
 * Run: node scripts/apply-schema.mjs            every migration (a new project)
 *      node scripts/apply-schema.mjs --from 004 only 004 and later (a database that already ran 001-003)
 *
 * Migrations 001 and 002 are not safe to run twice (they create tables and policies without IF NOT EXISTS); 004 and 005 are.
 */

import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = join(__dir, "../.env.local");
let envVars = {};
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    envVars[key] = val;
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const ACCESS_TOKEN = envVars["SUPABASE_ACCESS_TOKEN"] || process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"] || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const PROJECT_REF =
  envVars["SUPABASE_PROJECT_REF"] ||
  process.env.SUPABASE_PROJECT_REF ||
  (/^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(SUPABASE_URL)?.[1] ?? "");

if (!ACCESS_TOKEN || !PROJECT_REF) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  SUPABASE_ACCESS_TOKEN or the project was not found             ║
╠══════════════════════════════════════════════════════════════════╣
║  To run this script automatically:                              ║
║  1. Go to: https://supabase.com/dashboard/account/tokens        ║
║  2. Create a new access token                                   ║
║  3. Add to .env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxxx...       ║
║     (and NEXT_PUBLIC_SUPABASE_URL, which names the project)     ║
║  4. Re-run: node scripts/apply-schema.mjs                       ║
╠══════════════════════════════════════════════════════════════════╣
║  OR run manually in the Supabase SQL editor:                    ║
║  Paste contents of: supabase/setup.sql                          ║
║  (generated from the migrations: npm run db:build-setup)        ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ── Read SQL files ────────────────────────────────────────────────────────────
const fromIndex = process.argv.indexOf("--from");
const fromPrefix = fromIndex === -1 ? "" : String(process.argv[fromIndex + 1] ?? "");
const migrationsDir = join(__dir, "../supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => !fromPrefix || f.slice(0, fromPrefix.length) >= fromPrefix);

if (files.length === 0) {
  console.error(`No migration files to apply${fromPrefix ? ` from ${fromPrefix}` : ""}.`);
  process.exit(1);
}

// ── Run via Management API ─────────────────────────────────────────────────
async function runSQL(sql, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`✗ ${label} failed (${res.status}):`, JSON.stringify(json).substring(0, 300));
    return false;
  }

  console.log(`✓ ${label}`);
  return true;
}

console.log(`Applying ${files.length} migration file(s) to project ${PROJECT_REF}…`);
for (const file of files) {
  const ok = await runSQL(readFileSync(join(migrationsDir, file), "utf8"), file);
  if (!ok) {
    console.log("\nStopped at the first failure. If the error says 'already exists', that file was applied before:");
    console.log("re-run with --from <number of the first file that has not been applied>, e.g. --from 004\n");
    process.exit(1);
  }
}
console.log("\n✅ Schema applied. Run seed: node scripts/seed-db.mjs\n");
