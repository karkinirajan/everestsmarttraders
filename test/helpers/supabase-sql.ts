import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * A real Postgres (PGlite) set up the way Supabase sets one up, so the SQL in supabase/migrations is executed for real:
 * the three API roles, an `auth` schema with `auth.users`, `auth.uid()` and `auth.role()` reading the request's JWT claims.
 * Supabase's PostgREST sets those claims per request; asUser() does the same with set_config().
 */
const PRELUDE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
  -- PGlite has no uuid-ossp; Supabase has it. The one function the schema uses, backed by the core equivalent.
  create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}

/** A fresh database set up from one SQL script (supabase/setup.sql). */
export async function freshDatabaseFromSql(sql: string): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(sql.replace(/create extension if not exists "uuid-ossp";/gi, ""));
  return db;
}

/** A fresh database with every migration applied (or only those whose file name sorts at or before `upTo`). */
export async function freshDatabase(upTo?: string): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PRELUDE);
  for (const file of migrationFiles()) {
    if (upTo && file > upTo) break;
    // the extension is unavailable in PGlite (stubbed in the prelude); everything else runs as written
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8").replace(/create extension if not exists "uuid-ossp";/gi, "");
    await db.exec(sql);
  }
  return db;
}

export type Caller = { role: "anon" } | { role: "authenticated"; userId: string } | { role: "service_role" };

/** Runs `fn` as the given API caller, the way PostgREST would: role switched, JWT claims set, then restored. */
export async function as<T>(db: PGlite, caller: Caller, fn: () => Promise<T>): Promise<T> {
  const sub = caller.role === "authenticated" ? caller.userId : "";
  await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)`, [sub, caller.role]);
  await db.exec(`set role ${caller.role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`);
  }
}

/** Signs a user up the way Supabase Auth does: a row in auth.users (the trigger then creates a 'viewer' profile). */
export async function signUp(db: PGlite, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email]);
  return (rows[0] as { id: string }).id;
}

export async function setRole(db: PGlite, userId: string, role: "admin" | "editor" | "viewer"): Promise<void> {
  await db.query(`update public.profiles set role = $2 where id = $1`, [userId, role]);
}
