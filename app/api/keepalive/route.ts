import { NextResponse } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { runDatabaseKeepAlive, verifyCronAuth } from "@/lib/keepalive";
import { limiterKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Unauthenticated callers (when CRON_SECRET is not set) are limited to 6 keep-alive writes per hour.
const PUBLIC_KEEPALIVE_LIMIT = { limit: 6, windowMs: 60 * 60 * 1000 } as const;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

async function handleKeepAlive(request: Request) {
  const auth = verifyCronAuth(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  if (!auth.authenticated) {
    const address = clientAddress(request.headers);
    const verdict = memoryRateLimit(limiterKey("keepalive", address), PUBLIC_KEEPALIVE_LIMIT);
    if (!verdict.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(verdict.retryAfter),
          },
        },
      );
    }
  }

  const url = new URL(request.url);
  const source =
    url.searchParams.get("source") ??
    (request.headers.get("user-agent")?.toLowerCase().includes("vercel-cron")
      ? "vercel-cron"
      : auth.authenticated
        ? "cron"
        : "ping");

  const result = await runDatabaseKeepAlive(source);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, status: "degraded", error: result.error ?? "Database heartbeat failed." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: "alive",
      tier: result.tier,
      day: result.day,
      beatCount: result.beatCount,
      recordedAt: result.recordedAt,
      source: result.source,
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: Request) {
  return handleKeepAlive(request);
}

export async function POST(request: Request) {
  return handleKeepAlive(request);
}
