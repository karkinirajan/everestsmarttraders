import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshFake, holder } from "../helpers/mocks";

vi.mock("@/lib/supabase/admin-client", () => ({
  createAdminClient: () => holder.fake,
}));

const { resetKeepAliveMemory } = await import("@/lib/keepalive");
const { resetMemoryRateLimits } = await import("@/lib/rate-limit");
const keepaliveRoute = await import("@/app/api/keepalive/route");
const healthRoute = await import("@/app/api/health/route");

beforeEach(() => {
  freshFake();
  resetKeepAliveMemory();
  resetMemoryRateLimits();
  vi.unstubAllEnvs();
  holder.fake.rpcAnswer = {
    data: {
      ok: true,
      day: "2026-11-09",
      beat_count: 2,
      recorded_at: "2026-11-09T03:00:00.000Z",
      source: "github-actions",
    },
    error: null,
  };
});

describe("/api/keepalive", () => {
  it("runs immediately with a valid CRON_SECRET Bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "top-secret-cron-key");
    const req = new Request(
      "https://everestsmarttraders.com/api/keepalive?source=github-actions",
      {
        method: "GET",
        headers: { authorization: "Bearer top-secret-cron-key" },
      },
    );

    const res = await keepaliveRoute.GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      status: "alive",
      tier: "heartbeat_rpc",
      day: "2026-11-09",
      beatCount: 2,
      source: "github-actions",
    });
  });

  it("rejects an invalid Bearer token when CRON_SECRET is configured", async () => {
    vi.stubEnv("CRON_SECRET", "top-secret-cron-key");
    const req = new Request("https://everestsmarttraders.com/api/keepalive", {
      method: "POST",
      headers: { authorization: "Bearer wrong-key" },
    });

    const res = await keepaliveRoute.POST(req);
    expect(res.status).toBe(401);
  });

  it("allows rate-limited unauthenticated uptime pings when CRON_SECRET is not set", async () => {
    const req = new Request("https://everestsmarttraders.com/api/keepalive", {
      method: "GET",
      headers: { "x-real-ip": "203.0.113.10" },
    });

    const res = await keepaliveRoute.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      status: "alive",
      source: "ping",
    });
  });

  it("returns 429 when unauthenticated keepalive pings exceed the hourly rate limit", async () => {
    for (let i = 0; i < 6; i++) {
      const okRes = await keepaliveRoute.GET(
        new Request("https://everestsmarttraders.com/api/keepalive", {
          method: "GET",
          headers: { "x-real-ip": "203.0.113.99" },
        }),
      );
      expect(okRes.status).toBe(200);
    }

    const blocked = await keepaliveRoute.GET(
      new Request("https://everestsmarttraders.com/api/keepalive", {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.99" },
      }),
    );
    expect(blocked.status).toBe(429);
  });
});

describe("/api/health", () => {
  it("returns 200 healthy status and ensures the daily database heartbeat", async () => {
    const req = new Request("https://everestsmarttraders.com/api/health", {
      method: "GET",
      headers: { "x-real-ip": "203.0.113.25" },
    });

    const res = await healthRoute.GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      status: "healthy",
      day: "2026-11-09",
      tier: "heartbeat_rpc",
    });
  });
});
