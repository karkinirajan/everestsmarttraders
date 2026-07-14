/**
 * Create admin auth users in Supabase.
 *   ADMIN_INITIAL_PASSWORD=... node scripts/create-admin-users.mjs
 *
 * Creates three users (admin, kneeraazon, kailashk) with email
 * username@est.local, confirms them, and promotes their profile role to 'admin'.
 * Re-running is safe: existing users keep their current password (email, name,
 * and role are ensured). No password is stored in this script — new users get
 * the one-time ADMIN_INITIAL_PASSWORD (env var or .env entry), and passwords
 * are managed afterwards in the admin dashboard under Admin → Users.
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const envCandidates = [
  new URL("../.env.local", import.meta.url).pathname,
  new URL("../.env", import.meta.url).pathname,
];

const envPath = envCandidates.find((p) => existsSync(p));
if (!envPath) {
  console.error("No .env.local or .env found");
  process.exit(1);
}

const envVars = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  envVars[trimmed.slice(0, eq).trim()] = trimmed
    .slice(eq + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];
const LOGIN_DOMAIN = envVars["NEXT_PUBLIC_ADMIN_LOGIN_DOMAIN"] ?? "est.com";
// Prior domains whose users (by username) should be migrated to LOGIN_DOMAIN.
const LEGACY_DOMAINS = ["est.local"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// One-time password for newly created users only — never hardcoded here.
// Existing users are never password-reset; use Admin → Users in the dashboard.
const INITIAL_PASSWORD =
  process.env.ADMIN_INITIAL_PASSWORD ?? envVars["ADMIN_INITIAL_PASSWORD"];

const USERS = [
  { username: "admin", full_name: "Admin" },
  { username: "kneeraazon", full_name: "Kneeraazon" },
  { username: "kailashk", full_name: "Kailash K" },
];

async function findUserByEmail(email) {
  // admin.listUsers paginates; scan first page(s) until we find it.
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser({ username, full_name }) {
  const email = `${username}@${LOGIN_DOMAIN}`;
  console.log(`\n→ ${email}`);

  let existing = await findUserByEmail(email);
  let migratedFrom = null;
  if (!existing) {
    for (const domain of LEGACY_DOMAINS) {
      const legacyEmail = `${username}@${domain}`;
      const legacyUser = await findUserByEmail(legacyEmail);
      if (legacyUser) {
        existing = legacyUser;
        migratedFrom = legacyEmail;
        break;
      }
    }
  }

  let userId;

  if (existing) {
    // Never reset an existing user's password here — that's done from the
    // admin dashboard (Admin → Users).
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(
      migratedFrom
        ? `  ✓ migrated ${migratedFrom} → ${email} (${userId})`
        : `  ✓ updated existing user (${userId})`,
    );
  } else {
    if (!INITIAL_PASSWORD) {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD is required to create new users. " +
          "Set it as an env var or in .env.local, e.g. " +
          "ADMIN_INITIAL_PASSWORD=... node scripts/create-admin-users.mjs",
      );
    }
    if (INITIAL_PASSWORD.length < 8) {
      throw new Error("ADMIN_INITIAL_PASSWORD must be at least 8 characters.");
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: INITIAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  ✓ created user (${userId})`);
  }

  // Profile row is created by the on_auth_user_created trigger. Promote to admin.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, email, full_name, role: "admin" },
      { onConflict: "id" },
    );
  if (profileError) throw profileError;
  console.log(`  ✓ profile role set to admin`);
}

console.log(`Creating admin users @ ${LOGIN_DOMAIN}`);
for (const user of USERS) {
  try {
    await ensureUser(user);
  } catch (err) {
    console.error(`  ✗ ${user.username}:`, err.message ?? err);
    process.exitCode = 1;
  }
}
console.log("\nDone.");
