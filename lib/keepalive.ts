import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type KeepAliveTier = "heartbeat_rpc" | "ratelimit_rpc" | "site_settings" | "failed";

export interface KeepAliveResult {
  ok: boolean;
  tier: KeepAliveTier;
  day: string;
  beatCount: number;
  recordedAt: string;
  source: string;
  error?: string;
}

export type CronAuthResult =
  | { ok: true; authenticated: boolean }
  | { ok: false };

/**
 * Verifies an Authorization header against CRON_SECRET in constant time.
 * - When CRON_SECRET is set: requires `Authorization: Bearer <CRON_SECRET>`.
 * - When CRON_SECRET is unset: allows the request with `authenticated: false` so the route
 *   can apply a strict rate limit and still keep the database alive out of the box.
 */
export function verifyCronAuth(
  authHeader: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): CronAuthResult {
  const secret = env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    return { ok: true, authenticated: false };
  }
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { ok: false };
  }
  const provided = authHeader.slice("Bearer ".length).trim();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.byteLength !== b.byteLength) {
    return { ok: false };
  }
  return timingSafeEqual(a, b) ? { ok: true, authenticated: true } : { ok: false };
}

export function sanitizeHeartbeatSource(raw: unknown): string {
  if (typeof raw !== "string") return "cron";
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9._:-]/g, "").slice(0, 48);
  return cleaned || "cron";
}

let lastBeatDay: string | null = null;

export function resetKeepAliveMemory(): void {
  lastBeatDay = null;
}

/**
 * Executes a daily write against Supabase Postgres so the Free Tier database never pauses due to inactivity.
 *
 * Uses a 3-tier write fallback so it succeeds regardless of which migrations have been applied:
 *  1. `public.record_heartbeat(p_source)` (migration 006 — dedicated table + pruning)
 *  2. `public.rate_limit_hit('keepalive:YYYY-MM-DD', 86400)` (migration 005 — atomic counter upsert)
 *  3. `public.site_settings` upsert on `key = 'system_heartbeat'` (migration 001 — base schema)
 */
export async function runDatabaseKeepAlive(
  rawSource: unknown = "cron",
  now: Date = new Date(),
): Promise<KeepAliveResult> {
  const source = sanitizeHeartbeatSource(rawSource);
  const day = now.toISOString().slice(0, 10);
  const recordedAt = now.toISOString();

  try {
    const admin = createAdminClient();

    // Tier 1: Dedicated heartbeat RPC (migration 006)
    const { data: rpcData, error: rpcError } = await admin.rpc("record_heartbeat", {
      p_source: source,
    });
    if (!rpcError && rpcData && typeof rpcData === "object") {
      const record = rpcData as Record<string, unknown>;
      const resolvedDay = typeof record.day === "string" ? record.day : day;
      const beatCount = Number(record.beat_count);
      lastBeatDay = resolvedDay;
      return {
        ok: true,
        tier: "heartbeat_rpc",
        day: resolvedDay,
        beatCount: Number.isFinite(beatCount) && beatCount > 0 ? beatCount : 1,
        recordedAt: typeof record.recorded_at === "string" ? record.recorded_at : recordedAt,
        source,
      };
    }

    // Tier 2: Rate-limit counter upsert (migration 005)
    const { data: rlData, error: rlError } = await admin.rpc("rate_limit_hit", {
      p_key: `keepalive:${day}`,
      p_window_seconds: 86_400,
    });
    const rlCount = Number(rlData);
    if (!rlError && Number.isFinite(rlCount) && rlCount >= 1) {
      lastBeatDay = day;
      return {
        ok: true,
        tier: "ratelimit_rpc",
        day,
        beatCount: rlCount,
        recordedAt,
        source,
      };
    }

    // Tier 3: Base schema site_settings upsert (migration 001)
    const { error: settingsError } = await admin
      .from("site_settings")
      .upsert(
        {
          key: "system_heartbeat",
          value: { day, last_beat_at: recordedAt, source },
          description: "Automated daily keep-alive heartbeat",
        },
        { onConflict: "key" },
      )
      .select("key")
      .single();

    if (!settingsError) {
      lastBeatDay = day;
      return {
        ok: true,
        tier: "site_settings",
        day,
        beatCount: 1,
        recordedAt,
        source,
      };
    }

    console.error("[keepalive] All database heartbeat tiers failed");
    return {
      ok: false,
      tier: "failed",
      day,
      beatCount: 0,
      recordedAt,
      source,
      error: "Database heartbeat failed.",
    };
  } catch {
    console.error("[keepalive] Unexpected database error");
    return {
      ok: false,
      tier: "failed",
      day,
      beatCount: 0,
      recordedAt,
      source,
      error: "Database heartbeat failed.",
    };
  }
}

/**
 * Ensures at least one database write heartbeat has occurred on the current UTC calendar day
 * for this server instance. Used by `/api/health` and the Admin Dashboard as secondary self-healing triggers.
 */
export async function ensureDailyHeartbeat(
  source = "health",
  now: Date = new Date(),
): Promise<KeepAliveResult> {
  const today = now.toISOString().slice(0, 10);
  if (lastBeatDay === today) {
    return {
      ok: true,
      tier: "heartbeat_rpc",
      day: today,
      beatCount: 1,
      recordedAt: now.toISOString(),
      source: sanitizeHeartbeatSource(source),
    };
  }
  return runDatabaseKeepAlive(source, now);
}
