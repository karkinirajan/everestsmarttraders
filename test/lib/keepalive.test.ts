import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({
  createAdminClient: () => holder.fake,
}));

const {
  verifyCronAuth,
  sanitizeHeartbeatSource,
  runDatabaseKeepAlive,
  ensureDailyHeartbeat,
  resetKeepAliveMemory,
} = await import("@/lib/keepalive");

beforeEach(() => {
  freshFake();
  resetKeepAliveMemory();
  vi.unstubAllEnvs();
});

describe("verifyCronAuth", () => {
  it("validates matching Bearer CRON_SECRET in constant time", () => {
    const env = { CRON_SECRET: "super-secret-token" } as unknown as NodeJS.ProcessEnv;
    expect(verifyCronAuth("Bearer super-secret-token", env)).toEqual({
      ok: true,
      authenticated: true,
    });
    expect(verifyCronAuth("Bearer wrong-token", env)).toEqual({ ok: false });
    expect(verifyCronAuth("Bearer short", env)).toEqual({ ok: false });
    expect(verifyCronAuth(null, env)).toEqual({ ok: false });
    expect(
      verifyCronAuth("Bearer super-secret-token", {
        CRON_SECRET: "",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({
      ok: true,
      authenticated: false,
    });
  });
});

describe("sanitizeHeartbeatSource", () => {
  it("normalizes and bounds source strings", () => {
    expect(sanitizeHeartbeatSource("Vercel-Cron")).toBe("vercel-cron");
    expect(sanitizeHeartbeatSource("github actions / scheduled!")).toBe(
      "githubactionsscheduled",
    );
    expect(sanitizeHeartbeatSource("")).toBe("cron");
    expect(sanitizeHeartbeatSource(null)).toBe("cron");
    expect(sanitizeHeartbeatSource("a".repeat(120)).length).toBeLessThanOrEqual(48);
  });
});

describe("runDatabaseKeepAlive", () => {
  it("uses primary record_heartbeat RPC when available", async () => {
    holder.fake.rpcQueue.push({
      data: {
        ok: true,
        day: "2026-11-09",
        beat_count: 3,
        recorded_at: "2026-11-09T03:00:00.000Z",
        source: "vercel-cron",
      },
      error: null,
    });

    const res = await runDatabaseKeepAlive("vercel-cron");
    expect(res).toEqual({
      ok: true,
      tier: "heartbeat_rpc",
      day: "2026-11-09",
      beatCount: 3,
      recordedAt: "2026-11-09T03:00:00.000Z",
      source: "vercel-cron",
    });
  });

  it("falls back to rate_limit_hit RPC if migration 006 is not applied yet", async () => {
    holder.fake.rpcQueue.push(
      {
        data: null,
        error: { code: "42883", message: "function public.record_heartbeat does not exist" },
      },
      {
        data: 7,
        error: null,
      },
    );

    const res = await runDatabaseKeepAlive("github-actions");
    expect(res.ok).toBe(true);
    expect(res.tier).toBe("ratelimit_rpc");
    expect(res.beatCount).toBe(7);
    expect(res.source).toBe("github-actions");
  });

  it("falls back to site_settings upsert if both RPCs fail", async () => {
    holder.fake.rpcQueue.push(
      { data: null, error: { code: "42883", message: "missing record_heartbeat" } },
      { data: null, error: { code: "42883", message: "missing rate_limit_hit" } },
    );

    const res = await runDatabaseKeepAlive("manual-cli");
    expect(res.ok).toBe(true);
    expect(res.tier).toBe("site_settings");
    expect(res.beatCount).toBe(1);
    expect(res.source).toBe("manual-cli");
    expect(holder.fake.calls[0]?.table).toBe("site_settings");
    expect(holder.fake.calls[0]?.op).toBe("upsert");
  });

  it("returns ok: false when all 3 write mechanisms fail", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    holder.fake.rpcQueue.push(
      { data: null, error: { code: "XX000", message: "rpc1 down" } },
      { data: null, error: { code: "XX000", message: "rpc2 down" } },
    );
    holder.fake.setDefault({ data: null, error: { code: "XX000", message: "table down" } });

    const res = await runDatabaseKeepAlive("cron");
    expect(res.ok).toBe(false);
    expect(res.tier).toBe("failed");
    errSpy.mockRestore();
  });

  it("catches unexpected exceptions from the database client", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    holder.fake.rpc = async () => {
      throw new Error("connection reset");
    };
    const res = await runDatabaseKeepAlive("cron");
    expect(res.ok).toBe(false);
    expect(res.tier).toBe("failed");
    errSpy.mockRestore();
  });
});

describe("ensureDailyHeartbeat", () => {
  it("deduplicates writes within the same UTC day in memory", async () => {
    const today = new Date().toISOString().slice(0, 10);
    holder.fake.rpcAnswer = {
      data: {
        ok: true,
        day: today,
        beat_count: 1,
        recorded_at: new Date().toISOString(),
        source: "admin-dashboard",
      },
      error: null,
    };

    const first = await ensureDailyHeartbeat("admin-dashboard");
    const second = await ensureDailyHeartbeat("admin-dashboard");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(holder.fake.rpcCalls.length).toBe(1);
  });
});
