#!/usr/bin/env node
/**
 * Everest Smart Traders — Daily Supabase Keep-Alive Runner
 *
 * Ensures the Supabase Free Tier database is modified at least once every day so it never pauses from inactivity,
 * and optionally pings the live web deployment's `/api/keepalive` and `/api/health` endpoints.
 *
 * Usage:
 *   node scripts/keepalive.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));

function loadLocalEnv() {
  const vars = {};
  try {
    const raw = readFileSync(join(__dir, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      vars[key] = val;
    }
  } catch {
    // .env.local is optional in CI where environment variables are injected directly
  }
  return vars;
}

const localEnv = loadLocalEnv();
const env = (name) => process.env[name] || localEnv[name] || "";

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
const siteUrl = (env("NEXT_PUBLIC_SITE_URL") || env("SITE_URL") || "").replace(/\/+$/, "");
const cronSecret = env("CRON_SECRET");

const now = new Date();
const day = now.toISOString().slice(0, 10);
const recordedAt = now.toISOString();

async function writeDatabaseHeartbeat() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("ℹ️  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment; skipping direct DB write.");
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Tier 1: migration 006 record_heartbeat RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc("record_heartbeat", {
    p_source: "github-actions",
  });
  if (!rpcError && rpcData) {
    console.log(`✅ Heartbeat recorded via record_heartbeat RPC:`, JSON.stringify(rpcData));
    return true;
  }

  // Tier 2: migration 005 rate_limit_hit RPC
  const { data: rlData, error: rlError } = await supabase.rpc("rate_limit_hit", {
    p_key: `keepalive:${day}`,
    p_window_seconds: 86_400,
  });
  if (!rlError && Number.isFinite(Number(rlData))) {
    console.log(`✅ Heartbeat recorded via rate_limit_hit RPC (count=${rlData}, day=${day})`);
    return true;
  }

  // Tier 3: migration 001 site_settings upsert
  const { error: settingsError } = await supabase
    .from("site_settings")
    .upsert(
      {
        key: "system_heartbeat",
        value: { day, last_beat_at: recordedAt, source: "github-actions" },
        description: "Automated daily keep-alive heartbeat",
      },
      { onConflict: "key" },
    );
  if (!settingsError) {
    console.log(`✅ Heartbeat recorded via site_settings upsert (day=${day})`);
    return true;
  }

  console.error("✗ Failed to record database heartbeat:", settingsError.message);
  return false;
}

async function pingSiteEndpoint() {
  if (!siteUrl || siteUrl.includes("example.com") || siteUrl.includes("127.0.0.1")) {
    return false;
  }

  const headers = { "User-Agent": "EST-Daily-KeepAlive/1.0" };
  if (cronSecret) {
    headers["Authorization"] = `Bearer ${cronSecret}`;
  }

  try {
    const res = await fetch(`${siteUrl}/api/keepalive?source=scheduled-workflow`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text().catch(() => "");
    console.log(`🌐 Site ping ${siteUrl}/api/keepalive -> HTTP ${res.status}: ${body.slice(0, 200)}`);
    return res.ok;
  } catch (err) {
    console.warn(`⚠️  Could not reach ${siteUrl}/api/keepalive:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

const dbOk = await writeDatabaseHeartbeat();
const siteOk = await pingSiteEndpoint();

if (!dbOk && !siteOk && supabaseUrl && serviceRoleKey) {
  process.exit(1);
}
