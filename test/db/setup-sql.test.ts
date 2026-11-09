import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { as, freshDatabaseFromSql, signUp } from "../helpers/supabase-sql";

describe("supabase/setup.sql", () => {
  it("is exactly the migrations, in order (regenerate with: node scripts/build-setup-sql.mjs)", () => {
    expect(() => execFileSync("node", ["scripts/build-setup-sql.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("sets up a database in which the privilege escalation is closed and the limiter is locked down", async () => {
    const db = await freshDatabaseFromSql(readFileSync(join(process.cwd(), "supabase", "setup.sql"), "utf8"));
    const id = await signUp(db, "someone@example.com");
    await expect(as(db, { role: "authenticated", userId: id }, () => db.query("update public.profiles set role = 'admin' where id = $1", [id]))).rejects.toThrow(/Only an admin/);
    await expect(as(db, { role: "anon" }, () => db.query("select public.rate_limit_hit('k', 60)"))).rejects.toThrow(/permission denied/);
    await expect(as(db, { role: "anon" }, () => db.query("select public.record_heartbeat('anon')"))).rejects.toThrow(/permission denied/);
    const hb = await as(db, { role: "service_role" }, () => db.query<{ hb: { beat_count: number } }>("select public.record_heartbeat('setup-test') as hb"));
    expect(Number(hb.rows[0]?.hb.beat_count)).toBe(1);
    await db.close();
  });
});
