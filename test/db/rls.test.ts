import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { MIGRATIONS_DIR, as, freshDatabase, setRole, signUp } from "../helpers/supabase-sql";

// The migrations are executed for real (PGlite), with Supabase's roles and auth.uid() in place: see test/helpers/supabase-sql.ts.

const roleOf = async (db: PGlite, id: string) => ((await db.query<{ role: string }>("select role from public.profiles where id = $1", [id])).rows[0] as { role: string }).role;

describe("before migration 004 (the shipped 001-003 policies): the defect", () => {
  it("a freshly signed-up viewer can make themselves an admin", async () => {
    const db = await freshDatabase("003_add_video_url.sql");
    const id = await signUp(db, "visitor@example.com");
    expect(await roleOf(db, id)).toBe("viewer");
    await as(db, { role: "authenticated", userId: id }, () => db.query("update public.profiles set role = 'admin' where id = $1", [id]));
    expect(await roleOf(db, id)).toBe("admin");
  });

  it("anyone with the anon key can insert an inquiry that is already marked closed, with notes of their choosing", async () => {
    const db = await freshDatabase("003_add_video_url.sql");
    await as(db, { role: "anon" }, () => db.query("insert into public.inquiries (full_name, phone, status, notes) values ('x', '1234567', 'closed', 'planted')"));
    expect(((await db.query("select count(*)::int as n from public.inquiries")).rows[0] as { n: number }).n).toBe(1);
  });
});

describe("after migration 004", () => {
  let db: PGlite;
  let viewer: string;
  let editor: string;
  let admin: string;
  beforeAll(async () => {
    db = await freshDatabase();
    viewer = await signUp(db, "viewer@example.com");
    editor = await signUp(db, "editor@example.com");
    admin = await signUp(db, "admin@example.com");
    await setRole(db, editor, "editor"); // direct database access (no signed-in user): how the first admin is made
    await setRole(db, admin, "admin");
  });
  afterAll(() => db.close());

  const asUser = <T>(userId: string, fn: () => Promise<T>) => as(db, { role: "authenticated", userId }, fn);

  it("direct database access can still set a role (the SQL editor, migrations)", async () => {
    expect(await roleOf(db, editor)).toBe("editor");
    expect(await roleOf(db, admin)).toBe("admin");
  });

  it("a viewer cannot promote themselves", async () => {
    await expect(asUser(viewer, () => db.query("update public.profiles set role = 'admin' where id = $1", [viewer]))).rejects.toThrow(/Only an admin can change a role/);
    expect(await roleOf(db, viewer)).toBe("viewer");
  });

  it("an editor cannot promote themselves to admin, or demote an admin", async () => {
    await expect(asUser(editor, () => db.query("update public.profiles set role = 'admin' where id = $1", [editor]))).rejects.toThrow(/Only an admin/);
    // another user's row is not even visible for writing to an editor: zero rows change
    const result = await asUser(editor, () => db.query("update public.profiles set role = 'viewer' where id = $1", [admin]));
    expect(result.affectedRows).toBe(0);
    expect(await roleOf(db, admin)).toBe("admin");
  });

  it("changing the role to the value it already has is not a change", async () => {
    await asUser(viewer, () => db.query("update public.profiles set role = 'viewer' where id = $1", [viewer]));
  });

  it("an admin can change another user's role", async () => {
    await asUser(admin, () => db.query("update public.profiles set role = 'editor' where id = $1", [viewer]));
    expect(await roleOf(db, viewer)).toBe("editor");
    await asUser(admin, () => db.query("update public.profiles set role = 'viewer' where id = $1", [viewer]));
  });

  it("the service-role key (scripts/create-admin-users.mjs) can change a role", async () => {
    await as(db, { role: "service_role" }, () => db.query("update public.profiles set role = 'editor' where id = $1", [viewer]));
    expect(await roleOf(db, viewer)).toBe("editor");
    await setRole(db, viewer, "viewer");
  });

  it("a user can still edit their own name, but not another user's profile, and not their own id", async () => {
    await asUser(viewer, () => db.query("update public.profiles set full_name = 'New Name' where id = $1", [viewer]));
    expect(((await db.query<{ full_name: string }>("select full_name from public.profiles where id = $1", [viewer])).rows[0] as { full_name: string }).full_name).toBe("New Name");
    const other = await asUser(viewer, () => db.query("update public.profiles set full_name = 'Hijacked' where id = $1", [admin]));
    expect(other.affectedRows).toBe(0);
    await expect(asUser(viewer, () => db.query("update public.profiles set id = gen_random_uuid() where id = $1", [viewer]))).rejects.toThrow(/row-level security|cannot be changed/);
  });

  it("anon can no longer insert inquiries directly; the service-role key (the site's form actions) still can", async () => {
    await expect(as(db, { role: "anon" }, () => db.query("insert into public.inquiries (full_name, phone, status, notes) values ('x', '1234567', 'closed', 'planted')"))).rejects.toThrow(/row-level security/);
    await as(db, { role: "service_role" }, () => db.query("insert into public.inquiries (full_name, phone, message, status) values ('Real Person', '9800000000', 'Hello there', 'new')"));
    expect(((await db.query("select count(*)::int as n from public.inquiries")).rows[0] as { n: number }).n).toBe(1);
  });

  it("nobody but an admin or editor can read inquiries", async () => {
    expect(((await as(db, { role: "anon" }, () => db.query("select id from public.inquiries"))).rows).length).toBe(0);
    expect(((await asUser(viewer, () => db.query("select id from public.inquiries"))).rows).length).toBe(0);
    expect(((await asUser(editor, () => db.query("select id from public.inquiries"))).rows).length).toBe(1);
  });

  it("public reads of published content still work, and drafts stay hidden", async () => {
    await db.exec(`
      insert into public.blog_posts (title, slug, is_published) values ('Public post', 'public-post', true), ('Draft post', 'draft-post', false);
    `);
    const rows = (await as(db, { role: "anon" }, () => db.query<{ slug: string }>("select slug from public.blog_posts order by slug"))).rows;
    expect(rows.map((r) => r.slug)).toEqual(["public-post"]);
  });

  it("a viewer cannot write content; an editor can", async () => {
    await expect(asUser(viewer, () => db.query("insert into public.blog_posts (title, slug) values ('x', 'x-post')"))).rejects.toThrow(/row-level security/);
    await asUser(editor, () => db.query("insert into public.blog_posts (title, slug) values ('By editor', 'by-editor')"));
  });
});

describe("migration 005: the rate limiter", () => {
  let db: PGlite;
  let viewer: string;
  beforeAll(async () => {
    db = await freshDatabase();
    viewer = await signUp(db, "v@example.com");
  });
  afterAll(() => db.close());

  const hit = (key: string, seconds = 3600) => db.query<{ n: number }>("select public.rate_limit_hit($1, $2) as n", [key, seconds]);

  it("counts per key, atomically", async () => {
    const counts = await as(db, { role: "service_role" }, () => Promise.all(Array.from({ length: 12 }, () => hit("k"))));
    expect(counts.map((r) => Number((r.rows[0] as { n: number }).n)).sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it("counts in the window that contains now, aligned to the window length", async () => {
    await as(db, { role: "service_role" }, () => hit("aligned", 3600));
    const { rows } = await db.query<{ ok: boolean }>(
      "select (window_start <= now() and now() - window_start < interval '1 hour' and extract(epoch from window_start)::bigint % 3600 = 0) as ok from public.rate_limits where key = 'aligned'",
    );
    expect(rows).toEqual([{ ok: true }]);
  });

  it("sweeps windows older than a day now and then, and nothing newer", async () => {
    await db.exec(`
      insert into public.rate_limits (key, window_start, count) values
        ('stale-2d', now() - interval '2 days', 4), ('stale-25h', now() - interval '25 hours', 4),
        ('recent-23h', now() - interval '23 hours', 4), ('recent-1h', now() - interval '1 hour', 4)`);
    const keys = async () => (await db.query<{ key: string }>("select key from public.rate_limits where key not in ('k', 'seen', 'aligned', 'w') order by key")).rows.map((r) => r.key);
    let calls = 0;
    // the sweep runs on about one call in a hundred: keep calling until it has (0.99^5000 is about 1e-22)
    while ((await keys()).includes("stale-2d") && calls < 5000) {
      await as(db, { role: "service_role" }, () => hit("live", 3600));
      calls++;
    }
    expect(calls).toBeLessThan(5000);
    expect(await keys()).toEqual(["live", "recent-1h", "recent-23h"]);
    expect(Number(((await db.query<{ count: number }>("select count from public.rate_limits where key = 'live'")).rows[0] as { count: number }).count)).toBe(calls);
  });

  it("refuses a window shorter than a second", async () => {
    await expect(as(db, { role: "service_role" }, () => hit("w", 0))).rejects.toThrow(/at least one second/);
  });

  it("is not callable by anon or by a signed-in user: otherwise anyone could use up another caller's allowance", async () => {
    await expect(as(db, { role: "anon" }, () => hit("victim"))).rejects.toThrow(/permission denied/);
    await expect(as(db, { role: "authenticated", userId: viewer }, () => hit("victim"))).rejects.toThrow(/permission denied/);
  });

  it("the counters cannot be read or written through the API roles", async () => {
    await as(db, { role: "service_role" }, () => hit("seen"));
    expect((await as(db, { role: "anon" }, () => db.query("select * from public.rate_limits"))).rows.length).toBe(0);
    expect((await as(db, { role: "authenticated", userId: viewer }, () => db.query("select * from public.rate_limits"))).rows.length).toBe(0);
    const del = await as(db, { role: "anon" }, () => db.query("delete from public.rate_limits"));
    expect(del.affectedRows).toBe(0);
  });
});

describe("migration 006: keepalive heartbeat", () => {
  let db: PGlite;
  let viewer: string;
  beforeAll(async () => {
    db = await freshDatabase();
    viewer = await signUp(db, "hb@example.com");
  });
  afterAll(() => db.close());

  const beat = (source = "cron") =>
    db.query<{
      hb: {
        ok: boolean;
        day: string;
        beat_count: number;
        recorded_at: string;
        source: string;
      };
    }>("select public.record_heartbeat($1) as hb", [source]);

  it("upserts today's heartbeat row and increments beat_count on repeated calls", async () => {
    const first = await as(db, { role: "service_role" }, () => beat("vercel-cron"));
    expect(Number(first.rows[0]?.hb.beat_count)).toBe(1);
    expect(first.rows[0]?.hb.source).toBe("vercel-cron");

    const second = await as(db, { role: "service_role" }, () => beat("github-actions"));
    expect(Number(second.rows[0]?.hb.beat_count)).toBe(2);
    expect(second.rows[0]?.hb.source).toBe("github-actions");
  });

  it("prunes heartbeats older than 30 days and expired rate_limits rows", async () => {
    await db.exec(`
      insert into public.system_heartbeats (day, beat_count, last_source)
      values (current_date - 35, 3, 'old-cron');
      insert into public.rate_limits (key, window_start, count)
      values ('expired-rl', now() - interval '2 days', 2);
    `);

    await as(db, { role: "service_role" }, () => beat("cleanup-check"));
    const oldHb = await db.query(
      "select day from public.system_heartbeats where day < current_date - 30",
    );
    const oldRl = await db.query(
      "select key from public.rate_limits where key = 'expired-rl'",
    );
    expect(oldHb.rows.length).toBe(0);
    expect(oldRl.rows.length).toBe(0);
  });

  it("is not callable or readable by anon or authenticated users", async () => {
    await expect(as(db, { role: "anon" }, () => beat("anon"))).rejects.toThrow(/permission denied/);
    await expect(
      as(db, { role: "authenticated", userId: viewer }, () => beat("viewer")),
    ).rejects.toThrow(/permission denied/);
    expect(
      (await as(db, { role: "anon" }, () => db.query("select * from public.system_heartbeats")))
        .rows.length,
    ).toBe(0);
    expect(
      (
        await as(db, { role: "authenticated", userId: viewer }, () =>
          db.query("select * from public.system_heartbeats"),
        )
      ).rows.length,
    ).toBe(0);
  });
});

describe("the migration files", () => {
  it("004, 005, and 006 can be applied twice", async () => {
    const db = await freshDatabase();
    for (const file of [
      "004_lock_profile_roles_and_inquiries.sql",
      "005_rate_limits.sql",
      "006_keepalive_heartbeat.sql",
    ]) {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }
    const id = await signUp(db, "again@example.com");
    await expect(as(db, { role: "authenticated", userId: id }, () => db.query("update public.profiles set role = 'admin' where id = $1", [id]))).rejects.toThrow(/Only an admin/);
    await db.close();
  });
});
