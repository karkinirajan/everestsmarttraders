import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminClient: () => ({ rpc }) }));

import { durableRateLimit, limiterKey, memoryBucketCount, memoryRateLimit, resetMemoryRateLimits, resetRateLimitWarning } from "@/lib/rate-limit";

beforeEach(() => {
  rpc.mockReset();
  resetMemoryRateLimits();
  resetRateLimitWarning();
});
afterEach(() => vi.restoreAllMocks());

describe("limiterKey", () => {
  it("hashes the subject: the key never contains it", () => {
    const key = limiterKey("contact", "203.0.113.7");
    expect(key).toMatch(/^contact:[0-9a-f]{32}$/);
    expect(key).not.toContain("203");
  });
  it("is stable, and different per scope and per subject", () => {
    expect(limiterKey("a", "x")).toBe(limiterKey("a", "x"));
    expect(limiterKey("a", "x")).not.toBe(limiterKey("b", "x"));
    expect(limiterKey("a", "x")).not.toBe(limiterKey("a", "y"));
  });
});

describe("memoryRateLimit", () => {
  const cfg = { limit: 3, windowMs: 60_000 };
  it("allows up to the limit, then refuses, saying how long to wait", () => {
    const results = [0, 1, 2, 3, 4].map(() => memoryRateLimit("k", cfg, 1_000));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
    expect(results[0]?.retryAfter).toBe(0);
    expect(results[3]?.retryAfter).toBe(60);
  });
  it("rounds retryAfter up", () => {
    memoryRateLimit("r", { limit: 1, windowMs: 10_000 }, 0);
    expect(memoryRateLimit("r", { limit: 1, windowMs: 10_000 }, 4_500).retryAfter).toBe(6);
  });
  it("starts a new window when the old one ends", () => {
    for (let i = 0; i < 4; i++) memoryRateLimit("w", cfg, 0);
    expect(memoryRateLimit("w", cfg, 59_999).ok).toBe(false);
    expect(memoryRateLimit("w", cfg, 60_000).ok).toBe(true);
  });
  it("keeps keys apart", () => {
    for (let i = 0; i < 4; i++) memoryRateLimit("a", cfg, 0);
    expect(memoryRateLimit("b", cfg, 0).ok).toBe(true);
  });
  it("never forgets everyone at once when full: a flood of new keys cannot reset a caller who is over the limit", () => {
    for (let i = 0; i < 4; i++) memoryRateLimit("victim", cfg, 0);
    for (let i = 0; i < 6_000; i++) memoryRateLimit(`other-${i}`, cfg, 1 + i);
    expect(memoryRateLimit("victim", cfg, 6_001).ok).toBe(false);
  });
  it("holds a bounded number of callers however many keys arrive", () => {
    for (let i = 0; i < 20_000; i++) memoryRateLimit(`flood-${i}`, cfg, 1_000);
    expect(memoryBucketCount()).toBeLessThanOrEqual(5_000);
  });
  it("drops expired callers before anyone else when it needs room", () => {
    for (let i = 0; i < 4_999; i++) memoryRateLimit(`old-${i}`, { limit: 1, windowMs: 1_000 }, 0);
    for (let i = 0; i < 4; i++) memoryRateLimit("busy", cfg, 0); // the 5,000th key, and over its limit
    memoryRateLimit("new", cfg, 2_000); // full now; the 4,999 short windows have all expired
    expect(memoryBucketCount()).toBe(2); // busy (still in its window) and new
    expect(memoryRateLimit("busy", cfg, 2_001).ok).toBe(false);
  });
});

describe("durableRateLimit", () => {
  const cfg = { limit: 2, windowMs: 3_600_000 };
  it("asks the database function, with a hashed key and the window in seconds", async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    const verdict = await durableRateLimit("contact", "203.0.113.7", cfg);
    expect(verdict).toEqual({ ok: true, remaining: 1, retryAfter: 0 });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", { p_key: limiterKey("contact", "203.0.113.7"), p_window_seconds: 3600 });
  });
  it("refuses when the database count is over the limit", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await durableRateLimit("contact", "x", cfg)).toEqual({ ok: false, remaining: 0, retryAfter: 3600 });
  });
  it("allows exactly the limit", async () => {
    rpc.mockResolvedValue({ data: 2, error: null });
    expect((await durableRateLimit("contact", "x", cfg)).ok).toBe(true);
  });
  it("rounds a short window up to a whole second", async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    await durableRateLimit("s", "x", { limit: 5, windowMs: 10 });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", expect.objectContaining({ p_window_seconds: 1 }));
  });
  it("falls back to counting in memory when the function is missing, and says so once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "secret detail about the schema" } });
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await durableRateLimit("fb", "x", cfg)).ok);
    expect(results).toEqual([true, true, false, false]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret detail");
  });
  it("falls back when the call throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockRejectedValue(new Error("fetch failed"));
    expect((await durableRateLimit("t", "x", cfg)).ok).toBe(true);
  });
  it("falls back when the answer is not a number", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: "lots", error: null });
    expect((await durableRateLimit("n", "x", { limit: 1, windowMs: 60_000 })).ok).toBe(true);
    expect((await durableRateLimit("n", "x", { limit: 1, windowMs: 60_000 })).ok).toBe(false);
  });
});
